import { Candidate, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { geminiGenAI } from "../../services/gemini";
import { loadToolClasses } from "./utils/tool-loader";

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
  toolsAvailable: any[] = [];
  // schemasAvailable: Array<any> = [];
  WELCOME_MESSAGE = "";
  toolsDir?: string;
  toolsInitDone = false;


  constructor(
    name: string, description: string, systemPrompt: string,
    history?: Array<{ role: "user" | "model"; content: string }>,
    // toolsAvailable?: any[],
    // schemasAvailable?: Array<any>,
    WELCOME_MESSAGE?: string,
    toolsDir: string = "",
  ) {
    this.name = name;
    this.description = description;
    this.systemPrompt = systemPrompt;
    this.toolsDir = toolsDir;
    if (history) this.history = history;
    // if (toolsAvailable) this.toolsAvailable = toolsAvailable;
    // if (schemasAvailable) this.schemasAvailable = schemasAvailable;
    if (WELCOME_MESSAGE) this.WELCOME_MESSAGE = WELCOME_MESSAGE;
  }

  agentDetails() {
    return {
      name: this.name,
      description: this.description,
      systemPrompt: this.systemPrompt,
      toolsAvailable: this.toolsAvailable.map(t => ({ name: t.name, description: t.description })),
    };
  }
  async initTools() {
    if (!this.toolsDir) return;

    const classes = await loadToolClasses(this.toolsDir);
    for (const Cls of classes) {
      const instance = new Cls();
      this.toolsAvailable.push(instance);
    }
    this.toolsInitDone = true;
  }

  fetchToolObjByName(name: string): any | null {
    for (const tool of this.toolsAvailable) {
      if (tool.name === name) return tool;
    }
    return null;
  }

  async run({
    userMessage,
    priorProfile,
  }: {
    userMessage: string;
    priorProfile?: any;
  }) {
    this.history.push({ role: "user", content: userMessage });
    const updatedSystemPrompt = this.systemPrompt.replace("{{Current-State}}", JSON.stringify(priorProfile || {}));
    const response = await geminiGenAI({
      // model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      model: 'gemini-2.0-flash',
      messages: this.history,
      system_instruction: updatedSystemPrompt,
      tools: this.toolsAvailable
    });
    // console.log('gemini response', JSON.stringify(response, null, 2));
    let responseText = '';
    if (response.candidates) {
      await Promise.all(response.candidates.map(async (candidate: Candidate) => {
        if (candidate.content) {
          if (candidate.content?.parts) {
            for (const part of candidate.content?.parts) {
              if (part.text) {
                responseText += part.text;
              } else if (part.functionCall) {
                if (part.functionCall.name) {
                  let functionTool = this.fetchToolObjByName(part.functionCall.name);
                  let functionResponseText = await functionTool.run(part.functionCall.args);
                  // console.log('Function call response:', functionResponseText);
                  responseText += functionResponseText;
                }
              }
            }
          }
        }
      }));
    }

    // this.history.push({ role: "model", content: response.candidates?.[0]?.content?.parts?.[0]?.text || "" });
    // console.log(`gemini response`, JSON.stringify(response, null, 2));
    return responseText;
    // throw new Error("Not implemented");
  };

  absorbMessage(message: string) {
    this.history.push({ role: "user", content: message });
  }

  getWelcome() {
    return [this.WELCOME_MESSAGE];
  }
}
