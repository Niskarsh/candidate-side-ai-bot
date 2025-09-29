// server/extractor.js (ESM)
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const PROVIDER = (process.env.PROVIDER || 'gemini').toLowerCase();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// A common target schema for both providers
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    about_add: { type: 'string' },
    skills_add: { type: 'array', items: { type: 'string' } },
    experience_patch: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        company: { type: 'string' },
        start: { type: 'string', description: 'YYYY-MM or free text' },
        end: { type: 'string', description: 'YYYY-MM or "present"' },
        stack: { type: 'array', items: { type: 'string' } },
        outcomes: { type: 'string', description: '1–3 lines with metrics' }
      }
    }
  }
};

// ---- Gemini structured output
async function geminiExtract({ freeText, profile }) {
  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    // structured output via responseSchema
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA
    }
  });

  const sys = [
    'Extract structured resume/profile signals from user free text.',
    'Keep it concise. Do not invent facts.',
    'Return JSON that matches the responseSchema.'
  ].join(' ');

  const res = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: sys }] },
      { role: 'user', parts: [{ text: JSON.stringify({ freeText, profile }) }] }
    ]
  });

  const txt = res.response?.text?.();
  return txt ? JSON.parse(txt) : {};
}

// ---- OpenAI JSON mode
async function openaiExtract({ freeText, profile }) {
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const prompt = [
    'Extract structured resume/profile signals from user free text.',
    'Return strict JSON matching this schema keys:',
    Object.keys(RESPONSE_SCHEMA.properties).join(', '),
    'Do not add extra keys.'
  ].join(' ');

  const result = await client.responses.create({
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify({ freeText, profile }) }
    ],
    response_format: { type: 'json_object' }
  });

  const out = result?.output?.[0]?.content?.[0]?.text || '{}';
  return JSON.parse(out);
}

export async function extractFromFreeText({ freeText, profile }) {
  if (PROVIDER === 'openai') return openaiExtract({ freeText, profile });
  return geminiExtract({ freeText, profile });
}

export const readOpenAIText = (result) => {
  // Responses API: collect text from content items
  const out = result?.output;
  if (!Array.isArray(out)) return '';
  const texts = [];
  for (const item of out) {
    const parts = Array.isArray(item?.content) ? item.content : [];
    for (const p of parts) {
      if (typeof p?.text === 'string' && p.text.trim()) texts.push(p.text.trim());
    }
  }
  return texts.join('\n').trim();
}

export const readGeminiText = (resp) => {
  // candidates[0].content.parts[].text
  const parts = resp?.response?.candidates?.[0]?.content?.parts || [];
  const texts = parts.map(p => p?.text).filter(Boolean);
  return texts.join('\n').trim();
}
