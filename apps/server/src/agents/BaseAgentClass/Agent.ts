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
    toolsAvailable: Array<{ name: string; description: string }> = [];
    schemasAvailable: Array<any> = [];
    
    constructor(
      name: string, description: string, systemPrompt: string, history?: Array<{ role: "user" | "assistant"; content: string }>, toolsAvailable?: Array<{ name: string; description: string }>, schemasAvailable?: Array<any>
    ) {
      this.name = name;
      this.description = description;
      this.systemPrompt = systemPrompt;
      if (history) this.history = history;
      if (toolsAvailable) this.toolsAvailable = toolsAvailable;
      if (schemasAvailable) this.schemasAvailable = schemasAvailable;
    }
    run({
      userMessage,
      priorProfile,
    }: {
      userMessage: string;
      priorProfile?: any;
    }): Promise<AgentRunResult> {
      this.history.push({ role: "user", content: userMessage });
      throw new Error("Not implemented");
    };

    absorbMessage(message: string) {
      this.history.push({ role: "user", content: message });
    }
  }
  