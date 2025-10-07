import { GenerateContentResponse } from "@google/genai";
import { geminiGenAI } from "../../services/gemini";

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
  history: Array<{ role: "user" | "model"; content: string }> = [];
  toolsAvailable: Array<{ name: string; description: string }> = [];
  schemasAvailable: Array<any> = [];
  WELCOME_MESSAGE = "";

  constructor(
    name: string, description: string, systemPrompt: string,
    history?: Array<{ role: "user" | "model"; content: string }>,
    toolsAvailable?: Array<{ name: string; description: string }>,
    schemasAvailable?: Array<any>,
    WELCOME_MESSAGE?: string,
  ) {
    this.name = name;
    this.description = description;
    this.systemPrompt = systemPrompt;
    if (history) this.history = history;
    if (toolsAvailable) this.toolsAvailable = toolsAvailable;
    if (schemasAvailable) this.schemasAvailable = schemasAvailable;
    if (WELCOME_MESSAGE) this.WELCOME_MESSAGE = WELCOME_MESSAGE;
  }
  async run({
    userMessage,
    priorProfile,
  }: {
    userMessage: string;
    priorProfile?: any;
  }): Promise<GenerateContentResponse> {
    this.history.push({ role: "user", content: userMessage });
    const response = await geminiGenAI({
      // model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      model: 'gemini-2.0-flash',
      messages: this.history,
    });
    this.history.push({ role: "model", content: response.candidates?.[0]?.content?.parts?.[0]?.text || "" });
    // console.log(`gemini response`, JSON.stringify(response, null, 2));
    return response;
    // throw new Error("Not implemented");
  };

  absorbMessage(message: string) {
    this.history.push({ role: "user", content: message });
  }

  getWelcome() {
    return [this.WELCOME_MESSAGE];
  }
}
