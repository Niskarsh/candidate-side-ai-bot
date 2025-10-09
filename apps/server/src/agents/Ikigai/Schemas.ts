import { Type } from "@google/genai";

// Ikigai interactive turn (question/answer) schema
export const IkigaiQuestionReturnSchema = {
  type: Type.OBJECT,
  description: "One interactive block in the Ikigai test. Used for both asking and collecting a response.",
  properties: {
    userReply: {
      type: Type.OBJECT,
      description: "Present only when you need to ask user something beyond the quntions, or user asks something beyond the exercise.",
      properties: {
        most: { type: Type.INTEGER, description: "Index 1-4 for 'Most like me'." },
        least: { type: Type.INTEGER, description: "Index 1-4 for 'Least like me'." }
      },
      required: ["most", "least"],
      nullable: true
    },
    question: {
      type: Type.OBJECT,
      description: "Question payload to display to the user.",
      properties: {
        text: { type: Type.STRING, description: "Instruction text (e.g., 'Choose MOST and LEAST like you')." },
        options: {
          type: Type.ARRAY,
          description: "Exactly 4 options to choose from.",
          items: { type: Type.STRING },
          minItems: 4,
          maxItems: 4
        }
      },
      required: ["text", "options"]
    },
    state: {
      type: Type.OBJECT,
      description: "Opaque state and progress tracking for the orchestration layer.",
      properties: {
        token: { type: Type.STRING, description: "Opaque identifier for correlating turns." },
        progress: { type: Type.STRING, description: "Progress summary like 'A:3/12,B:0/10,C:0/10'." },
        stage: { type: Type.STRING, enum: ["A", "B", "C"], description: "Current stage." },
        block: { type: Type.INTEGER, description: "Current block number within the stage (1-based)." }
      },
      required: ["token", "progress", "stage", "block"]
    },
    isLastQuestion: {
      type: Type.BOOLEAN,
      description: "True only when this is the final question of the entire test."
    }
  },
  required: ["question", "state", "isLastQuestion"],
  additionalProperties: false
};


export const IkigaiReturnSchema = {
    type: Type.OBJECT,
    properties: {
        // updatedProfile: LinkedInProfileSchema,
        userReply: {
            type: Type.STRING,
            description: `
            This is how you with ask questions to user for ikigai exercise or
            Anythings to convey or pass to user, Orchestrator will relay this to user. Since this is the only way Ikigai agent can communicate with user. This cannot be empty.
            `
        },
        endFocus: { type: Type.BOOLEAN, description: "True if all jobs for Ikigai Sub agent is done" }
    },
    required: [
      // "updatedProfile", 
      "userReply", "endFocus"]
};
