export type ChatMessage = { role: "user" | "assistant"; content: string };

export type OrchestratorDecision = {
  intent: string;                 // e.g., 'profile_enrichment' | 'smalltalk'
  delegateTo?: string | null;     // agent name when delegating
  userFacingReply: string;        // Orchestrator reply to user this turn
  keepAgentInFocus?: boolean;     // whether sub-agent remains active
};
