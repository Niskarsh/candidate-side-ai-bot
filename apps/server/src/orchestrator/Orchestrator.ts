import type { ChatMessage } from "./types.js";
import type { OrchestratorDecision } from "./types.js";
import { findAgentByName, firstCapable } from "./registry.js";
import type { Agent } from "../agents/Agent.js";

/**
 * Orchestrator = Lead Agent.
 * - Maintains global convo & ephemeral profile state (in-memory for now)
 * - Decides whether to speak itself OR delegate to a sub-agent
 * - Relays sub-agent follow-ups to the user and retains/returns control
 * - Keeps track of "agent in focus" until done
 *
 * (We keep rules explicit here; you can also LLM-route using structured output.)  :contentReference[oaicite:4]{index=4}
 */

export type OrchestratorState = {
  focusedAgent?: string | null;
  profile: any;
  history: ChatMessage[];
};

export class Orchestrator {
  private state: OrchestratorState;

  constructor(initial?: Partial<OrchestratorState>) {
    this.state = {
      profile: {},
      history: [],
      focusedAgent: null,
      ...initial
    };
  }

  get snapshot() { return this.state; }

  decide(message: string): OrchestratorDecision {
    // Naive classifier for demo:
    const msg = message.toLowerCase();

    // If a sub-agent is already in focus, keep it unless user says "stop" or "done"
    if (this.state.focusedAgent && !/stop|done|cancel/.test(msg)) {
      return {
        intent: "continue_delegation",
        delegateTo: this.state.focusedAgent,
        userFacingReply: "Okay, continuing…",
        keepAgentInFocus: true
      };
    }

    // Route to ProfileBuilder on profile/gaps/linkedin
    if (/(profile|linkedin|enrich|experience|skills|education)/.test(msg)) {
      const agent = firstCapable("profile_enrichment");
      return {
        intent: "profile_enrichment",
        delegateTo: agent?.name ?? null,
        userFacingReply: "Sure—let me work on your profile.",
        keepAgentInFocus: true
      };
    }

    // Smalltalk / default
    return {
      intent: "smalltalk",
      delegateTo: null,
      userFacingReply: "I’m your orchestrator. Tell me if you want to build or update your profile."
    };
  }

  async delegateTo(agent: Agent, params: {
    userMessage: string;
  }) {
    const result = await agent.run({
      userMessage: params.userMessage,
      priorProfile: this.state.profile,
      history: this.state.history
    });

    // Collect outputs
    if (result.messages?.length) {
      for (const m of result.messages) {
        this.state.history.push({ role: "assistant", content: m });
      }
    }
    if (result.updatedProfile) {
      this.state.profile = { ...this.state.profile, ...result.updatedProfile };
    }
    if (result.takeBackControl) {
      this.state.focusedAgent = null;
    }

    // If sub-agent asked a follow-up, keep focus and return the question
    return result;
  }

  absorbUserMessage(message: string) {
    this.state.history.push({ role: "user", content: message });
  }

  setFocus(agentName?: string | null) {
    this.state.focusedAgent = agentName ?? null;
  }
}
