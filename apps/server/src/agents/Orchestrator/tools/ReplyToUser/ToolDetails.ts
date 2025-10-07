import { Type } from "@google/genai";

export const name = `orchestrator_reply`;
export const description = `Speak to the user in the orchestrator's voice with a short, clear message.`;
export const parameters = {
    type: Type.OBJECT,
    properties: { text: { type: Type.STRING, description: `This is orchestrator reply to user` } },
    required: ["text"]
};
