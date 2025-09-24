import OpenAI from 'openai';
function summarizeState(state) {
    const p = state?.profile || {};
    return {
        hasProfile: !!state?.profile,
        score: completenessScore(p),
        missing: {
            about: !p.about,
            skills5: !(p.skills || []).length || (p.skills || []).length < 5,
            impactExp: !((p.experiences || []).some(e => /%|\+|improv|increase|decrease|saved|grew|latency|cost|NPS|MAU|DAU|revenue|convers/i.test(e?.description || ''))),
            location: !p.location
        }
    };
}


async function geminiPlan({ goal, state, last_user_message }) {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        tools: [{
            functionDeclarations: Object.entries(TOOL_SCHEMA).map(([name, t]) => ({ name, description: t.description, parameters: t.parameters }))
        }]
    });


    const input = {
        goal,
        stateSummary: summarizeState(state),
        last_user_message
    };


    const resp = await model.generateContent({
        contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'user', parts: [{ text: JSON.stringify(input) }] }
        ],
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
    });


    const call = resp?.response?.functionCalls?.[0];
    if (!call) return { action: 'request_clarification', args: { question: 'Hit me with your latest role: title, stack, and a win with numbers.', fields: ['title', 'stack', 'impact'] } };
    return { action: call.name, args: call.args || {} };
}


async function openaiPlan({ goal, state, last_user_message }) {
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });


    const tools = Object.entries(TOOL_SCHEMA).map(([name, t]) => ({ type: 'function', function: { name, description: t.description, parameters: t.parameters } }));


    const input = [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ goal, stateSummary: summarizeState(state), last_user_message }) }];


    const result = await client.responses.create({ model: OPENAI_MODEL, input, tools, tool_choice: 'auto' });
    const tool = result?.output?.[0];
    const call = tool?.type === 'tool_calls' ? tool.tool_calls?.[0] : null;
    if (!call) return { action: 'request_clarification', args: { question: 'Hit me with your latest role: title, stack, and a win with numbers.', fields: ['title', 'stack', 'impact'] } };
    return { action: call.function.name, args: JSON.parse(call.function.arguments || '{}') };
}


export function createPlanner() {
    if ((process.env.PROVIDER || 'gemini').toLowerCase() === 'openai') {
        if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
        return { plan: (payload) => openaiPlan(payload) };
    }
    if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing');
    return { plan: (payload) => geminiPlan(payload) };
}