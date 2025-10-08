import { Type } from "@google/genai";

// Ikigai interactive turn (question/answer) schema
export const IkigaiQuestionReturnSchema = {
  type: Type.OBJECT,
  description: "One interactive block in the Ikigai test. Used for both asking and collecting a response.",
  properties: {
    userReply: {
      type: Type.OBJECT,
      description: "Present only after the user answers. Null when asking the question.",
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

