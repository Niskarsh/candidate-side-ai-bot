// profile: {
//     workExperience: {
//         details: Record<string, any>[],
//         complete: boolean;
//     },
//     skills: {
//         details: string[],
//         complete: boolean;
//     },
//     education: {
//         details: Record<string, any>[],
//         complete: boolean;
//     },
//     interests: string[];
//     summary: string | null;
// };

import { Type } from "@google/genai";

export const LinkedInProfileSchema = {
    type: Type.OBJECT,
    properties: {
      workExperience: {
        type: Type.OBJECT,
        properties: {
          details: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Job title" },
                company: { type: Type.STRING, description: "Company name" },
                startDate: { type: Type.STRING, description: "Start date (YYYY-MM)" },
                endDate: { type: Type.STRING, description: "End date (YYYY-MM or 'Present')" },
                description: { type: Type.STRING, description: "Job description" }
              },
              required: ["title", "company", "startDate", "endDate", "description"]
            },
            description: "List of work experiences"
          },
          complete: {
            type: Type.BOOLEAN,
            description:
              "Is work experience section complete. False if there are any gaps that need to be filled."
          }
        },
        required: ["details", "complete"]
      },
  
      skills: {
        type: Type.OBJECT,
        properties: {
          details: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of skills"
          },
          complete: { type: Type.BOOLEAN, description: "Is skills section complete" }
        },
        required: ["details", "complete"]
      },
  
      education: {
        type: Type.OBJECT,
        properties: {
          details: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING, description: "School name" },
                degree: { type: Type.STRING, description: "Degree obtained" },
                fieldOfStudy: { type: Type.STRING, description: "Field of study" },
                startDate: { type: Type.STRING, description: "Start date (YYYY-MM)" },
                endDate: { type: Type.STRING, description: "End date (YYYY-MM or 'Present')" }
              },
              required: ["school", "degree", "fieldOfStudy", "startDate", "endDate"]
            },
            description: "List of educational qualifications"
          },
          complete: {
            type: Type.BOOLEAN,
            description:
              "Is education section complete. False if there are any gaps that need to be filled."
          }
        },
        required: ["details", "complete"]
      },
  
      interests: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of interests"
      },
  
      summary: {
        type: Type.STRING,
        description: "Professional summary or bio"
      }
    },
    required: ["workExperience", "skills", "education", "interests", "summary"]
  };
  