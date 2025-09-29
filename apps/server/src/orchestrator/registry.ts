import { Agent } from "../agents/Agent.js";
import { ProfileBuilderAgent } from "../agents/ProfileBuilderAgent.js";

const agents: Agent[] = [
  new ProfileBuilderAgent(),
  // add more agents here later
];

export function listAgents() {
  return agents.map(a => ({ name: a.name, description: a.description }));
}

export function findAgentByName(name?: string | null) {
  if (!name) return undefined;
  return agents.find(a => a.name.toLowerCase() === name.toLowerCase());
}

export function firstCapable(intent: string): Agent | undefined {
  // simple strategy: only ProfileBuilder for profile intents
  if (intent === "profile_enrichment") return findAgentByName("ProfileBuilder");
  return undefined;
}
