import { Router } from "express";
import { Orchestrator } from "../orchestrator/Orchestrator.js";
import { findAgentByName } from "../orchestrator/registry.js";

// Single orchestrator instance for demo (stateless per-process)
const orchestrator = new Orchestrator();

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: "message_required" });
  }

  try {
    orchestrator.absorbUserMessage(message);
    const decision = orchestrator.decide(message);

    let responseBubbles: string[] = [];
    let followUpQuestion: string | undefined;

    if (decision.delegateTo) {
      // Keep focus on the chosen agent
      orchestrator.setFocus(decision.keepAgentInFocus ? decision.delegateTo : null);

      const agent = findAgentByName(decision.delegateTo);
      if (!agent) {
        responseBubbles.push("No suitable sub-agent found.");
      } else {
        const agentResult = await orchestrator.delegateTo(agent, { userMessage: message });
        if (agentResult.followUpQuestion) {
          followUpQuestion = agentResult.followUpQuestion;
        }
        if (agentResult.takeBackControl) {
          orchestrator.setFocus(null); // lead agent takes control back
        }
      }
    } else {
      // Orchestrator speaks directly
      responseBubbles.push(decision.userFacingReply);
    }

    // Always add orchestrator's userFacingReply as the "lead voice"
    if (decision.userFacingReply) {
      responseBubbles.unshift(decision.userFacingReply);
    }

    return res.json({
      decision,
      messages: responseBubbles,
      followUpQuestion,
      profilePreview: orchestrator.snapshot.profile,
      focusedAgent: orchestrator.snapshot.focusedAgent
    });
  } catch (e: any) {
    console.error("Chat error:", e);
    return res.status(500).json({ error: e?.message ?? "chat_failed" });
  }
});
