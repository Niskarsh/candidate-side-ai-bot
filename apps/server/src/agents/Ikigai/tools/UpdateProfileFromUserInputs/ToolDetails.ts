import { Type } from "@google/genai";

export const name = `update_profile_from_user_inputs`;
export const description = `This is used to extract user profile information from user messages(since linkedin data extraction is already done).`;
export const parameters = {
    type: Type.OBJECT,
    properties: { 
        text: { type: Type.STRING, description: `This is reply to user conveyed by orchestrator` },
        extractedProfile: { type: Type.OBJECT, description: `This is extracted profile information from user messages. This cannot be empty.` }
    },
    required: ["text", "extractedProfile"]
};
