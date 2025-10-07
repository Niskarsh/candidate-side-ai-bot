import { Type } from "@google/genai";

export const name = `delegate`;
export const description = `Delegate to a known sub-agent by name, and pass a detailed instruction on what it is expected to do.`;
export const parameters = {
    type: Type.OBJECT,
    properties: {
        agentName: { type: Type.STRING },
        detailedInput: { type: Type.STRING, description: "Detailed description on what this agent is supposed to do, with what input. We will have separate system instructions, so this will more describe how to handle the input" }
    },
    required: ["agentName", "detailedInput"]
};
