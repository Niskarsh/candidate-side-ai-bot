import { Router } from "express";
import { Orchestrator } from '../agents/Orchestrator/Agent';

const orchestrator = new Orchestrator();

export const chatRouter = Router();

chatRouter.get("/hello", (_req, res) => {
  const messages = orchestrator.getWelcome();
  res.json({ messages, profilePreview: orchestrator.currentState.profile, focusedAgent: orchestrator.currentState.focusedAgent });
});

chatRouter.post("/", async (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message_required" });
  }

  try {
    if (!orchestrator.toolsInitDone) {
      await orchestrator.initTools();
    }
    const turn = await orchestrator.step(message);
    res.json({
      messages: turn.messages,
      profilePreview: orchestrator.currentState.profile,
      focusedAgent: orchestrator.currentState.focusedAgent
    });
  } catch (e: any) {
    console.error("[ORCH ERROR]", e);
    res.status(500).json({ error: e?.message ?? "chat_failed" });
  }
});
