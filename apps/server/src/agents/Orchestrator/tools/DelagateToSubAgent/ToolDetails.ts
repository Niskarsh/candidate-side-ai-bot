import { Type } from "@google/genai";

export const name = `delegate`;
export const description = `Delegate to a known sub-agent by name, and pass a detailed instruction on what it is expected to do.`;
export const parameters = {
    type: Type.OBJECT,
    properties: {
        agentName: { type: Type.STRING },
        detailedInput: { type: Type.STRING, description: "We will have separate system instructions, so pass the input passed from user here" }
    },
    required: ["agentName", "detailedInput"]
};
