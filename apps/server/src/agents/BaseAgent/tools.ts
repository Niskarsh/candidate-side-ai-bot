import type { FunctionDeclaration } from "@google/genai";
import { enrichLinkedIn } from "../../services/linkedin";
import { dummyLinkedIn } from "../dummy";

export type ToolExecution = (args: any) => Promise<any>;
export type ToolSpec = {
  name: string;
  description: string;
  parameters: any;            // JSON schema-like
  run: ToolExecution;
  toFunctionDeclaration(): FunctionDeclaration;
};

function asFnDecl(spec: ToolSpec): FunctionDeclaration {
  return {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters
  };
}

// Tool 1: LinkedIn enrichment (server-side)
export const linkedinTool: ToolSpec = {
  name: "linkedin_enrich",
  description: "Fetch and normalize a candidate profile from a LinkedIn public URL.",
  parameters: {
    type: "OBJECT",
    properties: {
      linkedin_url: { type: "STRING", description: "Public LinkedIn profile URL" }
    },
    required: ["linkedin_url"]
  },
  async run(args: any) {
    const result = await enrichLinkedIn(String(args.linkedin_url));
    return result;
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 2: Ask user a question (delegated via orchestrator)
export const askUserTool: ToolSpec = {
  name: "emit_question",
  description: "Ask the candidate for a missing field (e.g., LinkedIn URL, email).",
  parameters: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING", description: "Plain-language question for the user." }
    },
    required: ["question"]
  },
  async run(args: any) {
    // This returns data for the orchestrator/UI to surface.
    return { question: String(args.question) };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

export const TOOLBOX: ToolSpec[] = [linkedinTool, askUserTool];
export const toolDeclarations = TOOLBOX.map(t => t.toFunctionDeclaration());
export async function executeTool(name: string, args: any) {
  if (name === 'linkedin_enrich') {
    return dummyLinkedIn;
  }
  const t = TOOLBOX.find(x => x.name === name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  const result = await t.run(args);
  return { name, result };
}



