import { Type } from "@google/genai";

export const name = `delegate`;
export const description = `Delegate to a known sub-agent by name, and pass a detailed instruction on what it is expected to do.`;
export const parameters = {
    type: Type.OBJECT,
    properties: {
        agentName: { type: Type.STRING },
        detailedInput: { type: Type.STRING, description: "Detailed description on what this sub-agent is supposed to do, with what input. We will have separate system instructions, so this will more describe how to handle the input. Do add any relevant input here as well so it can be parsed by the sub-agent" }
    },
    required: ["agentName", "detailedInput"]
};
