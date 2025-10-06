import { Router } from "express";
import { Orchestrator } from "../orchestrator/Orchestrator.js";

const orchestrator = new Orchestrator();
export const chatRouter = Router();

chatRouter.get("/hello", (_req, res) => {
  const messages = orchestrator.getWelcome();
  res.json({ messages, profilePreview: orchestrator.snapshot.profile, focusedAgent: orchestrator.snapshot.focusedAgent });
});

chatRouter.post("/", async (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message_required" });
  }

  try {
    orchestrator.absorbUserMessage(message);
    const turn = await orchestrator.step(message);
    res.json({
      messages: turn.messages,
      profilePreview: orchestrator.snapshot.profile,
      focusedAgent: orchestrator.snapshot.focusedAgent
    });
  } catch (e: any) {
    console.error("[ORCH ERROR]", e);
    res.status(500).json({ error: e?.message ?? "chat_failed" });
  }
});
