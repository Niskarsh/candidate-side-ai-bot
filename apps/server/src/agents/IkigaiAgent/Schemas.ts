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
            type: Type.OBJECT,
            properties: {
                details: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of interests"
                },
                complete: {
                    type: Type.BOOLEAN,
                    description: "Is interests section complete"
                },
            },
            required: ["details", "complete"],

        },

        summary: {
            type: Type.OBJECT,
            properties: {
                details: {
                    type: Type.STRING,
                    description: "Professional summary or bio"
                },
                complete: {
                    type: Type.BOOLEAN,
                    description: "Is summary section complete"
                },
            },
            required: ["details", "complete"]
        }
    },
    required: ["workExperience", "skills", "education", "interests", "summary"]
};

export const ProfileBuilderReturnSchema = {
    type: Type.OBJECT,
    properties: {
        updatedProfile: LinkedInProfileSchema,
        userReply: {
            type: Type.STRING,
            description: `
            Pass to orchestrator about any gaps in the linkedin profile data, if its all complete, say profile is complete and prompt to do Ikigai exercise. Orchestrator will relay this to user. Since this is the only way ProfileBuilder agent can communicate with user. This cannot be empty.
            `
        },
        endFocus: { type: Type.BOOLEAN, description: "True if profile is sufficiently complete and ProfileBuilder agent has done all its jobs, that is Complete Profile and Ikigai exercise" }
    },
    required: ["updatedProfile", "userReply", "endFocus"]
};

