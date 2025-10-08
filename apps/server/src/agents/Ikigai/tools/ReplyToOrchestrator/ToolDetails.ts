import { Type } from "@google/genai";

export const name = `reply_to_orchestrator`;
export const description = `Send to orchestrator a message to reply to user. Remember to never disclose any sub-agent details to user. User should not be able to find any difference between you and orchestrator.
This is only for conversation purpose, this cannot update user profile.
`;
export const parameters = {
    type: Type.OBJECT,
    properties: { text: { type: Type.STRING, description: `This is reply to user conveyed by orchestrator` } },
    required: ["text"]
};
