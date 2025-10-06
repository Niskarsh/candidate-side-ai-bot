export type AgentRunResult = {
    messages: string[];            // assistant-visible messages this turn
    updatedProfile?: any;          // merged/enriched profile (no DB yet)
    missingFields?: string[];
    followUpQuestion?: string;     // if sub-agent needs user input
    takeBackControl?: boolean;     // signal orchestrator to resume speaking
  };
  
  export class Agent {
    name: string;
    description: string;
    systemPrompt: string;
    history: Array<{ role: "user" | "assistant"; content: string }> = [];

    constructor(name: string, description: string, systemPrompt: string) {
      this.name = name;
      this.description = description;
      this.systemPrompt = systemPrompt;
    }
    run(params: {
      userMessage: string;
      priorProfile?: any;
      history: Array<{ role: "user" | "assistant"; content: string }>;
    }): Promise<AgentRunResult> {
      throw new Error("Not implemented");
    };
  }
  