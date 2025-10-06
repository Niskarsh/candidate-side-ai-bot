import { GoogleGenAI, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
// import * as dotenv from "dotenv";
// dotenv.config();
console.log(`3333333333333333`, process.env.GEMINI_API_KEY)
/**
 * Minimal Gemini wrapper for function-calling and structured output.
 * Function calling allows the model to CHOOSE a tool and pass parameters;
 * structured output (responseSchema) forces JSON shape when finishing.  :contentReference[oaicite:1]{index=1}
 */
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// export function getModel(modelName = "gemini-1.5-flash") {
//   return client.getGenerativeModel({ model: modelName });
// }

export async function geminiGenAI({
  model,
  contents,
  config = {},
}: {
  model: string;
  contents: Array<{ role: "user" | "model" | "tool"; text: string; name?: string }>;
  config?: {
    [key: string]: any;
    tools?: Array<{
      functionDeclarations: FunctionDeclaration[];
    }>;
  };
}): Promise<GenerateContentResponse> {
  if (!model) throw new Error("No model specified");
  return client.models.generateContent({
    model,
    contents: contents,
    config: config
  });
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
          properties: {
            linkedin: { type: SchemaType.STRING, nullable: true }
          }
        },

        // ✅ define minimal shapes for array items
        experiences: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              company: { type: SchemaType.STRING, nullable: true },
              title: { type: SchemaType.STRING, nullable: true },
              date_range: { type: SchemaType.STRING, nullable: true },
              location: { type: SchemaType.STRING, nullable: true },
              description: { type: SchemaType.STRING, nullable: true }
            }
          }
        },
        educations: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              school: { type: SchemaType.STRING, nullable: true },
              degree: { type: SchemaType.STRING, nullable: true },
              field_of_study: { type: SchemaType.STRING, nullable: true },
              start_year: { type: SchemaType.STRING, nullable: true },
              end_year: { type: SchemaType.STRING, nullable: true }
            }
          }
        }
      }
    },

    missingFields: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
  },
  required: ["finalMessage"]
} as const;
