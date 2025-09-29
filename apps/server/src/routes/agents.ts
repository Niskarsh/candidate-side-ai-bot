import { Router } from "express";
import { listAgents } from "../orchestrator/registry.js";

export const agentsRouter = Router();
agentsRouter.get("/", (_req, res) => res.json({ agents: listAgents() }));
