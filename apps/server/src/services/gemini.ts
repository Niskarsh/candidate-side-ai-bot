import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
// import * as dotenv from "dotenv";
// dotenv.config();
console.log(`3333333333333333`, process.env.GEMINI_API_KEY)
/**
 * Minimal Gemini wrapper for function-calling and structured output.
 * Function calling allows the model to CHOOSE a tool and pass parameters;
 * structured output (responseSchema) forces JSON shape when finishing.  :contentReference[oaicite:1]{index=1}
 */
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export function getModel(modelName = "gemini-1.5-flash") {
  return client.getGenerativeModel({ model: modelName });
}

export async function geminiPlanStep(opts: {
  systemInstruction: string;
  chatHistory: Array<{ role: "user" | "model" | "tool"; text: string; name?: string }>;
  userMessage?: string;
  functionDeclarations: FunctionDeclaration[];
  finishSchema?: any;
}) {
  const model = getModel(process.env.GEMINI_MODEL);

  const contents: any[] = [];
  for (const m of opts.chatHistory) {
    if (m.role === "tool") {
      contents.push({
        role: "tool",
        parts: [{ functionResponse: { name: m.name!, response: { result: m.text } } }]
      });
    } else {
      contents.push({ role: m.role, parts: [{ text: m.text }] });
    }
  }
  if (opts.userMessage) contents.push({ role: "user", parts: [{ text: opts.userMessage }] });

  const request: any = {
    systemInstruction: opts.systemInstruction,
    contents,
    tools: [{ functionDeclarations: opts.functionDeclarations }],
    generationConfig: {}
  };

  if (opts.finishSchema) {
    request.generationConfig.responseMimeType = "application/json";
    request.generationConfig.responseSchema = opts.finishSchema;
  }

  const { response } = await model.generateContent(request);
  console.log(`4444444444444444`, JSON.stringify(response, null, 2))
  const toolCalls = response.functionCalls?.() ?? [];
  console.log(`5555555555555555 toolCalls`, toolCalls)
  const text = response.text();
  return { text, toolCalls };
}

export const ProfileFinishSchema = {
  type: SchemaType.OBJECT,
  properties: {
    finalMessage: { type: SchemaType.STRING },
    updatedProfile: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, nullable: true },
        headline: { type: SchemaType.STRING, nullable: true },
        location: { type: SchemaType.STRING, nullable: true },
        skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        links: {
          type: SchemaType.OBJECT,
          properties: { linkedin: { type: SchemaType.STRING, nullable: true } }
        },
        experiences: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT } },
        educations: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT } }
      }
    },
    missingFields: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
  },
  required: ["finalMessage"]
} as const;
