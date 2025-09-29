import { Agent, AgentRunResult } from "./Agent.js";
import { geminiPlanStep, ProfileFinishSchema } from "../services/gemini.js";
import { toolDeclarations, executeTool } from "./tools.js";

/**
 * True sub-agent:
 * - Plans
 * - Chooses tools via Gemini function-calling (linkedin_enrich / emit_question)
 * - Asks follow-ups through Orchestrator
 * - Finishes with structured updated profile
 *
 * This mirrors a ReAct planning loop: think -> act (tool) -> observe -> ask/finish. :contentReference[oaicite:3]{index=3}
 */
export class ProfileBuilderAgent implements Agent {
  name = "ProfileBuilder";
  description = "Builds and enriches a candidate's profile using tools and clarifying questions.";
  systemPrompt = `
You are the Profile Builder Agent.
Goal: produce a high-quality candidate profile with fields:
{name, headline, location, skills[], links{linkedin}, experiences[], educations[]}

Tools available:
- linkedin_enrich(linkedin_url: string)
- emit_question(question: string)

Rules:
1) If no LinkedIn URL but user seems willing, call emit_question to request it.
2) If LinkedIn URL present, call linkedin_enrich; then normalize/merge fields.
3) If key fields remain missing, call emit_question with a specific, short question.
4) When satisfied, FINISH with JSON (finalMessage, updatedProfile, missingFields).
5) Be concise and friendly.

Always choose between:
- TOOL CALL (one at a time)
- FINISH (use structured JSON schema)
`;

  async run({ userMessage, priorProfile, history }: {
    userMessage: string;
    priorProfile?: any;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<AgentRunResult> {

    const chatHistory = history.map(m => ({ role: m.role === "assistant" ? "model" : "user", text: m.content } as { role: "user" | "model" | "tool"; text: string; name?: string | undefined; }));

    // Step 1: plan; tool call or finish
    const step1 = await geminiPlanStep({
      systemInstruction: this.systemPrompt + `\nCurrentProfile:\n${JSON.stringify(priorProfile ?? {}, null, 2)}`,
      chatHistory,
      userMessage,
      functionDeclarations: toolDeclarations
    });

    if (step1.toolCalls.length > 0) {
      const call = step1.toolCalls[0];
      const toolResult = await executeTool(call.name, call.args);
      console.log(`6666666666666666 toolResult`, toolResult)
      // Step 2: reflect on tool result; either ask another question (emit_question), or FINISH
      const step2 = await geminiPlanStep({
        systemInstruction: this.systemPrompt + `\nCurrentProfile:\n${JSON.stringify(priorProfile ?? {}, null, 2)}`,
        chatHistory: [
          ...chatHistory,
          { role: "user", text: userMessage },
          { role: "tool", name: call.name, text: JSON.stringify(toolResult.result) }
        ],
        functionDeclarations: toolDeclarations,
        finishSchema: ProfileFinishSchema as any
      });

      if (step2.toolCalls.length > 0) {
        const next = step2.toolCalls[0];
        if (next.name === "emit_question") {
          return {
            messages: ["I need a bit more info to complete your profile."],
            followUpQuestion: String(next.args?.question ?? "Could you clarify?"),
            takeBackControl: false
          };
        }
        return { messages: ["Working on it…"] }; // (Next HTTP turn executes next tool)
      }

      // Try to FINISH with structured JSON
      try {
        const finish = JSON.parse(step2.text);
        return {
          messages: [finish.finalMessage],
          updatedProfile: finish.updatedProfile,
          missingFields: finish.missingFields,
          takeBackControl: true
        };
      } catch {
        return { messages: ["Profile updated."], takeBackControl: true };
      }
    }

    // No tool call—maybe can FINISH now
    try {
      const finish = JSON.parse(step1.text);
      return {
        messages: [finish.finalMessage],
        updatedProfile: finish.updatedProfile,
        missingFields: finish.missingFields,
        takeBackControl: true
      };
    } catch {
      // Or pure talk
      return {
        messages: [step1.text || "Got it. Share your LinkedIn URL and I’ll enrich your profile."],
        takeBackControl: false
      };
    }
  }
}
