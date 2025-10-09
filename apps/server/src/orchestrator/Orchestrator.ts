import type { ChatMessage } from "./types.js";
import { listAgents, findAgentByName } from "./registry.js";
import { runOrchestratorPolicy } from "../services/policy.js";

export type OrchestratorState = {
  focusedAgent?: string | null;
  profile: any;
  history: ChatMessage[];
  hasWelcomed: boolean;
  summary: string;
  lastDelegationAnnouncedFor?: string | null;
};

export class Orchestrator {
  private state: OrchestratorState;

  constructor(initial?: Partial<OrchestratorState>) {
    this.state = {
      profile: {},
      history: [],
      focusedAgent: null,
      hasWelcomed: false,
      summary: "",
      lastDelegationAnnouncedFor: null,
      ...initial
    };
  }

  get snapshot() { return this.state; }

  getWelcome(): string[] {
    if (this.state.hasWelcomed) return [];
    this.state.hasWelcomed = true;
    return [
      "Hi, I’m your Orchestrator 🤝",
      "I can build or enrich your candidate profile. Paste your LinkedIn URL, or say “build my profile”. I’ll ask only what’s needed."
    ];
  }

  absorbUserMessage(message: string) {
    this.state.history.push({ role: "user", content: message });
  }

  setFocus(agentName?: string | null) {
    this.state.focusedAgent = agentName ?? null;
  }

  // very light “summary” maintenance to show the policy; replace with a better summarizer later
  private updateSummary(turnText: string) {
    const keep = (this.state.summary ? this.state.summary + " • " : "") + turnText;
    this.state.summary = keep.split(" • ").slice(-3).join(" • ");
  }

  async decideWithPolicy(message: string) {
    // convert history to model format
    const chat = this.state.history.map(m => ({ 
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model" | "tool", 
      text: m.content 
    }));
    const registry = listAgents(); // [{name, description}]

    const { text, toolCalls } = await runOrchestratorPolicy({
      userMessage: message,
      agentRegistry: registry,
      profile: this.state.profile,
      summary: this.state.summary,
      chatHistory: chat
    });

    // If model returned plain text, treat it as a direct reply
    if (!toolCalls.length) {
      return { action: "reply", payload: { text: text || "Okay." } } as const;
    }

    const call = toolCalls[0];
    if (call.name === "orchestrator_reply") {
      return { action: "reply", payload: { text: (call.args as any)?.text ?? text ?? "Okay." } } as const;
    }
    if (call.name === "ask_user") {
      return { action: "ask", payload: { question: (call.args as any)?.question ?? "Could you clarify?" } } as const;
    }
    if (call.name === "delegate") {
      return { action: "delegate", payload: { agentName: String((call.args as any)?.agentName || ""), briefInput: String((call.args as any)?.briefInput || "") } } as const;
    }
    if (call.name === "end_focus") {
      return { action: "end_focus", payload: {} } as const;
    }
    return { action: "reply", payload: { text: text || "Okay." } } as const;
  }

  async step(message: string) {
    const out = await this.decideWithPolicy(message);
console.log(`88888888888888888 out`, out)
    if (out.action === "reply") {
      const t = out.payload.text;
      this.state.history.push({ role: "assistant", content: t });
      this.updateSummary(t);
      return { messages: [t] };
    }

    if (out.action === "ask") {
      const q = out.payload.question;
      this.state.history.push({ role: "assistant", content: q });
      this.updateSummary("asked: " + q);
      return { messages: ["❓ " + q] };
    }

    if (out.action === "end_focus") {
      this.setFocus(null);
      return { messages: ["Okay—taking it from here."] };
    }

    if (out.action === "delegate") {
      const agentName = out.payload.agentName || "ProfileBuilder";
      const agent = findAgentByName(agentName);
      if (!agent) return { messages: [`I don't have an agent named "${agentName}".`] };

      // Announce delegation once per agent session
      // if (this.state.focusedAgent !== agentName && this.state.lastDelegationAnnouncedFor !== agentName) {
      //   this.state.lastDelegationAnnouncedFor = agentName;
      //   this.state.history.push({ role: "assistant", content: `Bringing in ${agentName}…` });
      // }

      // Announce delegation once per agent session
      if (this.state.focusedAgent !== agentName) {
        this.state.lastDelegationAnnouncedFor = agentName;
        this.state.history.push({ role: "assistant", content: `Bringing in ${agentName}…` });
      }

      this.setFocus(agentName);

      // handoff: the sub-agent uses the message and current profile
      const result = await agent.run({
        userMessage: message,
        priorProfile: this.state.profile,
        history: this.state.history
      });
console.log(`99999999999999999 result`, result)
      const msgs: string[] = [];
      if (result.messages?.length) {
        msgs.push(...result.messages);
        result.messages.forEach(m => this.state.history.push({ role: "assistant", content: m }));
      }
      if (result.followUpQuestion) {
        msgs.push("❓ " + result.followUpQuestion);
        this.state.history.push({ role: "assistant", content: result.followUpQuestion });
      }
      if (result.updatedProfile) {
        this.state.profile = { ...this.state.profile, ...result.updatedProfile };
      }
      if (result.takeBackControl) {
        this.setFocus(null);
        this.state.lastDelegationAnnouncedFor = null;
      }

      if (!msgs.length) msgs.push("Working on it…");
      this.updateSummary(msgs[0]);
      return { messages: msgs };
    }

    return { messages: ["Okay."] };
  }
}
