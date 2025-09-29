export type AgentRunResult = {
    messages: string[];            // assistant-visible messages this turn
    updatedProfile?: any;          // merged/enriched profile (no DB yet)
    missingFields?: string[];
    followUpQuestion?: string;     // if sub-agent needs user input
    takeBackControl?: boolean;     // signal orchestrator to resume speaking
  };
  
  export interface Agent {
    name: string;
    description: string;
    systemPrompt: string;
    run(params: {
      userMessage: string;
      priorProfile?: any;
      history: Array<{ role: "user" | "assistant"; content: string }>;
    }): Promise<AgentRunResult>;
  }
  