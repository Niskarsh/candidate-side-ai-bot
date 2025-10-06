import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { geminiPlanStep } from "./gemini.js";

export const orchestratorTools: FunctionDeclaration[] = [
  {
    name: "orchestrator_reply",
    description: "Speak to the user in the orchestrator's voice with a short, clear message.",
    parameters: {
      type: "OBJECT",
      properties: { text: { type: "STRING" } },
      required: ["text"]
    }
  },
  {
    name: "ask_user",
    description: "Ask the user for a specific piece of information if it unblocks progress.",
    parameters: {
      type: "OBJECT",
      properties: { question: { type: "STRING" } },
      required: ["question"]
    }
  },
  {
    name: "delegate",
    description: "Delegate to a known sub-agent by name, and pass a short instruction.",
    parameters: {
      type: "OBJECT",
      properties: {
        agentName: { type: "STRING" },
        briefInput: { type: "STRING", description: "Pass description from whats passed for this agent in <agent-list> section" }
      },
      required: ["agentName"]
    }
  },
  {
    name: "end_focus",
    description: "End the current delegation and resume orchestrator control.",
    parameters: { type: "OBJECT", properties: {} }
  }
];

const ORCHESTRATOR_POLICY_PROMPT = `
You are the Orchestrator (lead agent) Your job is to build candidate job profile with minor nuances.
You own the global plan, know what's collected(at all times), sub agents available and their capabilities. Based on that you  decide what happens next. You can either:
- speak to the user (orchestrator_reply),
- ask a clarifying question (ask_user),
- delegate to a sub-agent (delegate),
- end delegation (end_focus) to resume direct control.

Conversation Guide:
- You will start with direct interaction, be as much human as possible, have some sass in your tone. Your eventual goal is to collect a high-quality candidate profile, so direct the conversation towards that, but subtlely.
- When you delegate, Ensure that user does not not feel a sudden change in tone or style. The handoff should be smooth and natural.
- Be aware of what has already been collected in the profile to avoid redundant questions.
- Be aware of sub-agent capabilities and delegate when a sub-agent is clearly better suited (e.g., ProfileBuilder for enrichment/gaps).
- If the user refuses to provide LinkedIn, switch to Q&A profile building (do not pester about LinkedIn again).
- Never return silence. If unsure, ask a focused question.
- Do not repeat the same announcement when delegation is already active.
- Always favor delegation when a sub-agent is clearly better suited.
- For delagation, dont announce with text, return that action with a function call. Always check your function declarations. We are checking tool calls result for delegation.

You have the following sub-agents available:
<agent-list>
{{AGENT_REGISTRY}}
</agent-list>

Current profile (JSON):
<profile-json>
{{PROFILE_JSON}}
</profile-json>

Conversation summary (1-3 bullets):
<summary>
{{SUMMARY}}
</summary>

Guidelines:
- Be brief and specific. One action per turn.
- Delegate when a sub-agent is clearly better suited (e.g., ProfileBuilder for enrichment/gaps).
- If user refuses LinkedIn, switch to Q&A profile building (do not pester about LinkedIn again).
- Never return silence. If unsure, ask a focused question.
- Do not repeat the same announcement when delegation is already active.
`;

export async function runOrchestratorPolicy(params: {
  userMessage: string;
  agentRegistry: Array<{ name: string; description: string }>;
  profile: any;
  summary: string;
  chatHistory: Array<{ role: "user" | "model" | "tool"; text: string }>;
}) {
  const systemInstruction = ORCHESTRATOR_POLICY_PROMPT
    .replace("{{AGENT_REGISTRY}}", JSON.stringify(params.agentRegistry, null, 2))
    .replace("{{PROFILE_JSON}}", JSON.stringify(params.profile ?? {}, null, 2))
    .replace("{{SUMMARY}}", params.summary || "- (no summary)");
console.log(`7777777777777777777 systemInstruction`, systemInstruction)
  const res = await geminiPlanStep({
    systemInstruction,
    chatHistory: params.chatHistory,
    userMessage: params.userMessage,
    functionDeclarations: orchestratorTools
  });

  return res; // { text, toolCalls[] } – toolCalls[0] will be our policy action
}
