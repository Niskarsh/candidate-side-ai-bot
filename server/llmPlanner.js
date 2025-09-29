// server/llmPlanner.js
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { readOpenAIText, readGeminiText } from './extractor.js';
dotenv.config();

const PROVIDER = (process.env.PROVIDER || 'gemini').toLowerCase();

// OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

// Gemini
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// ---------- Tool specs (provider-agnostic) ----------
const LOGICAL_TOOLS = {
  spawn_profile_builder: {
    description:
      'Use when a valid LinkedIn URL is present and the profile is missing/incomplete. Enriches profile (name, headline, skills, experiences with dates/descriptions, education, avatar).',
    args: { linkedinUrl: { type: 'string', required: true } },
  },
  request_clarification: {
    description:
      'Ask ONE concise, human question to fill a concrete gap (impact metrics, tech stack, outcomes, dates, role scope, location).',
    args: {
      question: { type: 'string', required: true },
      fields: { type: 'array<string>', required: true },
    },
  },
  finalize_profile: {
    description: 'Signal that the profile is coherent and complete enough to go idle.',
    args: {},
  },
};

// ---------- Build OpenAI tools ----------
function buildOpenAITools() {
  const toJsonSchema = (args) => {
    const properties = {};
    const required = [];
    for (const [k, v] of Object.entries(args || {})) {
      if (v.required) required.push(k);
      if (v.type === 'array<string>') {
        properties[k] = { type: 'array', items: { type: 'string' } };
      } else {
        properties[k] = { type: v.type };
      }
    }
    return { type: 'object', properties, ...(required.length ? { required } : {}) };
  };

  return Object.entries(LOGICAL_TOOLS).map(([name, t]) => ({
    type: 'function',
    function: { name, description: t.description, parameters: toJsonSchema(t.args) },
  }));
}

// ---------- Build Gemini functionDeclarations ----------
function buildGeminiFunctionDeclarations() {
  const toGeminiSchema = (args) => {
    const properties = {};
    const required = [];
    for (const [k, v] of Object.entries(args || {})) {
      if (v.required) required.push(k);
      if (v.type === 'array<string>') {
        properties[k] = { type: 'ARRAY', items: { type: 'STRING' } };
      } else {
        const upper = (v.type || 'string').toUpperCase();
        properties[k] = { type: ['STRING', 'INTEGER', 'NUMBER', 'BOOLEAN', 'ARRAY', 'OBJECT'].includes(upper) ? upper : 'STRING' };
      }
    }
    return { type: 'OBJECT', properties, ...(required.length ? { required } : {}) };
  };

  return Object.entries(LOGICAL_TOOLS).map(([name, t]) => ({
    name, description: t.description, parameters: toGeminiSchema(t.args),
  }));
}

// ---------- Strong planner brief (no canned fallbacks) ----------
const SYSTEM_PROMPT = `
You are "Kari", a sassy but human mentor agent. You plan next actions and return EXACTLY ONE tool/function call.

ACTIONS:
1) spawn_profile_builder(linkedinUrl)
   - Use when a valid LinkedIn URL is present and the profile is missing/incomplete.
2) request_clarification(question, fields[])
   - Ask ONE crisp, friendly, human question to fill the most valuable missing gap.
   - 'fields' is a small set like ["impact","stack","dates","location","title"].
3) finalize_profile()
   - Use when profile has: summary/about; >=1 recent experience; at least one quantified outcome; primary stack; >=5 skills; location; dates for recent role.

Rules:
- If a LinkedIn URL is present, prefer spawn_profile_builder.
- After enrichment, ask only what’s missing (numbers/outcomes/dates/stack/scope).
- Avoid repeating the exact same ask; consider state.askHistory.
- One question at a time; no multi-part interrogations.
- Tone: warm, confident, slightly cheeky; never robotic.
Return ONLY a function call; no prose. If uncertain, choose the most valuable missing gap and ask about it via request_clarification.
`;

// ---------- Completeness / summary ----------
function completenessScore(p = {}) {
  let score = 0;
  if (p.about) score += 20;
  if ((p.skills || []).length >= 5) score += 20;
  if (p.location) score += 10;
  const hasImpact = (p.experiences || []).some((e) =>
    /%|\+|improv|reduc|increase|decrease|saved|grew|latency|cost|reliab|NPS|MAU|DAU|revenue|convers/i.test(e?.description || '')
  );
  if (hasImpact) score += 30;
  if ((p.experiences || []).length >= 1) score += 20;
  return Math.min(score, 100);
}

function summarizeState(state) {
  const p = state?.profile || {};
  return {
    hasProfile: !!state?.profile,
    score: completenessScore(p),
    missing: {
      about: !p.about,
      skills5: !(p.skills || []).length || (p.skills || []).length < 5,
      impact: !((p.experiences || []).some((e) =>
        /%|\+|improv|increase|decrease|saved|grew|latency|cost|NPS|MAU|DAU|revenue|convers/i.test(e?.description || '')
      )),
      location: !p.location,
      dates: !((p.experiences || [])[0]?.date_range),
      stack: !(p.skills || []).length,
    },
  };
}

// ---------- Robust parsers ----------
function safeParse(s) { try { return s ? JSON.parse(s) : {}; } catch { return {}; } }

function parseOpenAIToolCall(result) {
  // Responses API: find first tool call in output
  const out = result?.output;
  if (!Array.isArray(out)) return null;
  for (const item of out) {
    if (item?.type === 'tool_calls' && Array.isArray(item.tool_calls) && item.tool_calls[0]) {
      const tc = item.tool_calls[0];
      return { name: tc.function?.name, args: safeParse(tc.function?.arguments) };
    }
    const tu = item?.content?.find?.(c => c?.type === 'tool_use');
    if (tu) return { name: tu?.name, args: tu?.input || {} };
  }
  return null;
}

function parseGeminiToolCall(resp) {
  const calls = resp?.response?.functionCalls
    || resp?.response?.candidates?.[0]?.content?.parts?.filter(p => p?.functionCall).map(p => p.functionCall);
  const call = Array.isArray(calls) ? calls[0] : null;
  return call ? { name: call.name, args: call.args || {} } : null;
}

// ---------- Providers ----------
async function geminiPlan({ goal, state, last_user_message }) {
  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    tools: [{ functionDeclarations: buildGeminiFunctionDeclarations() }],
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] }, // system instruction for Gemini
  });

  const inputPayload = {
    goal,
    stateSummary: summarizeState(state),
    askHistory: state?.askHistory || [],
    last_user_message,
  };

  const t0 = Date.now();
  console.log('[planner][gemini] input:', JSON.stringify(inputPayload, null, 2));
  const resp = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(inputPayload) }] }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  });
  const t1 = Date.now();
  console.log('[planner][gemini] ms:', t1 - t0);

  const call = parseGeminiToolCall(resp);
  console.log('[planner][gemini] call:', call);
  if (call) return { action: call.name, args: call.args || {} };
  const text = readGeminiText(resp);
  if (text) return { action: 'assistant_message', args: { text } };
  // single strict retry for malformed output (no canned strings)
  const retry = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'Return either: a function call OR a short assistant message asking exactly one question.' }] }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  });
  const call2 = parseGeminiToolCall(retry);
  if (call2) return { action: call2.name, args: call2.args || {} };
  const text2 = readGeminiText(retry);
  if (text2) return { action: 'assistant_message', args: { text: text2 } };
  return { action: 'assistant_message', args: { text: '…' } }; // unreachable safety; will rarely hit
}

async function openaiPlan({ goal, state, last_user_message }) {
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const tools = buildOpenAITools();
  const input = [
    { role: 'system', content: SYSTEM_PROMPT },  // system role for OpenAI
    { role: 'user', content: JSON.stringify({ goal, stateSummary: summarizeState(state), askHistory: state?.askHistory || [], last_user_message }) },
  ];

  const t0 = Date.now();
  console.log('[planner][openai] input:', JSON.stringify(input, null, 2));
  const result = await client.responses.create({ model: OPENAI_MODEL, input, tools, tool_choice: 'auto' });
  const t1 = Date.now();
  console.log('[planner][openai] ms:', t1 - t0);
  // You can also log a compact view of result if needed:
  // console.log('[planner][openai] raw:', JSON.stringify(result, null, 2));

  const call = parseOpenAIToolCall(result);
  console.log('[planner][openai] call:', call);
  if (call) return { action: call.name, args: call.args || {} };
  const text = readOpenAIText(result);
  if (text) return { action: 'assistant_message', args: { text } };
  const result2 = await client.responses.create({
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: 'Return either: a function call OR a short assistant message asking exactly one question.' }
    ],
    tools, tool_choice: 'auto',
  });
  const call2 = parseOpenAIToolCall(result2);
  if (call2) return { action: call2.name, args: call2.args || {} };
  const text2 = readOpenAIText(result2);
  if (text2) return { action: 'assistant_message', args: { text: text2 } };
  return { action: 'assistant_message', args: { text: '…' } }; // unreachable safety

}

// ---------- Turn lock (coalesce duplicates) ----------
const planningLocks = new Map(); // key -> promise
async function withPlanLock(key, fn) {
  if (planningLocks.get(key)) return planningLocks.get(key);
  const p = fn().finally(() => planningLocks.delete(key));
  planningLocks.set(key, p);
  return p;
}

// ---------- Factory ----------
export function createPlanner() {
  const planImpl = PROVIDER === 'openai' ? openaiPlan : geminiPlan;
  if (PROVIDER === 'openai' && !OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  if (PROVIDER !== 'openai' && !GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing');

  return {
    plan: (payload) => {
      const key = payload?.idempotency_key || `${payload?.goal?.linkedinUrl || 'nolink'}:${payload?.state?.messages?.length || 0}`;
      console.log('[planner] idempotency_key:', key);
      return withPlanLock(key, () => planImpl(payload));
    },
  };
}
