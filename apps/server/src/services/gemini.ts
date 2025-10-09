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
  // Use stable model - fallback to gemini-1.5-flash if GEMINI_MODEL not set or if it's the overloaded one
  const modelName = (process.env.GEMINI_MODEL === 'gemini-2.0-flash-lite' || !process.env.GEMINI_MODEL) 
    ? "gemini-1.5-flash" 
    : process.env.GEMINI_MODEL;
  const model = getModel(modelName);

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

// Extract JSON evidence from conversational answers
export async function geminiExtractJSON(userPrompt: string): Promise<any> {
  const systemPrompt = `
You are an evidence extractor. Given a user's free-text answer, you MUST return a strict JSON object with:
- 'trait_evidence': array of { trait, direction, strength, justification }
- 'axis_evidence': array of { axis, pole, strength, justification }

Rules:
- Do NOT infer beyond the text; be conservative.
- direction ∈ {"up","down"} indicates how the answer supports or contradicts a trait.
- pole is the LEFT or RIGHT word of the axis name exactly.
- strength ∈ {1,2} (1 = weak hint, 2 = strong hint).
- justification: short quote or paraphrase from the answer.

Return ONLY JSON, no extra text.
`;

  const extractorSchema = {
    type: SchemaType.OBJECT,
    properties: {
      trait_evidence: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            trait: { type: SchemaType.STRING },
            direction: { type: SchemaType.STRING },
            strength: { type: SchemaType.INTEGER },
            justification: { type: SchemaType.STRING }
          }
        }
      },
      axis_evidence: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            axis: { type: SchemaType.STRING },
            pole: { type: SchemaType.STRING },
            strength: { type: SchemaType.INTEGER },
            justification: { type: SchemaType.STRING }
          }
        }
      }
    },
    required: ["trait_evidence", "axis_evidence"]
  };

  const model = getModel();
  const { response } = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: extractorSchema
    }
  });

  const text = response.text();
  return JSON.parse(text);
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
