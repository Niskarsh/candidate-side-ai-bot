import path from "path";
import { fileURLToPath } from "node:url";
import { Agent } from "../BaseAgent/Agent";
import { name, description, systemPrompt } from "./AgentDetails";
import { Candidate } from "@google/genai";
import { name as ProfileBuilderLinkedinEnrichToolName } from './tools/LinkedinEnrich/ToolDetails';
export class ProfileBuilder extends Agent {
    currentState: {
        profile: {
            workExperience: {
                details: Record<string, any>[],
                complete: boolean;
            },
            skills: {
                details: string[],
                complete: boolean;
            },
            education: {
                details: Record<string, any>[],
                complete: boolean;
            },
            interests: string[];
            summary: string | null;
        };
        ikigaiCollected: boolean;
        linkedinUrl: string | null;
    };

    constructor(toolsAvailable?: Array<{ name: string; description: string }>, schemasAvailable?: Array<any>
    ) {
        // @ts-expect-error The 'import.meta' meta-property is only allowed
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const toolsDir = path.resolve(__dirname, "tools");
        super(
            name, description, systemPrompt, [], '', toolsDir
        );
        this.currentState = {
            profile: {
                workExperience: {
                    details: [],
                    complete: false,
                },
                skills: {
                    details: [],
                    complete: false,
                },
                education: {
                    details: [],
                    complete: false,
                },
                interests: [],
                summary: null,
            },
            ikigaiCollected: false,
            linkedinUrl: null,
        };
        if (this.WELCOME_MESSAGE) {
            this.history.push({ role: "model", content: this.WELCOME_MESSAGE });
        }
    }

    async step(message: string) {
        // this.absorbMessage(message);
        // console.log('ProfileBuilder stepping with message:', message);
        const response = await this.run({ userMessage: message, priorProfile: this.currentState.profile });
        console.log('ProfileBuilder run response:', JSON.stringify(response));
        let responseText = '';
        if (response.candidates) {
            await Promise.all(response.candidates.map(async (candidate: Candidate) => {
                if (candidate.content) {
                    if (candidate.content?.parts) {
                        for (const part of candidate.content?.parts) {
                            if (part.text) {
                                responseText += part.text;
                            } else if (part.functionCall) {
                                if (part.functionCall.name) {
                                    switch (part.functionCall.name) {
                                        case ProfileBuilderLinkedinEnrichToolName: {
                                            let functionTool = this.fetchToolObjByName(part.functionCall.name);
                                            let functionResponseText = await functionTool.run({ args: part.functionCall.args });
                                            // console.log('Function call response:', functionResponseText);
                                            // responseText += functionResponseText;
                                            break;
                                        }
                                    }

                                }
                            }
                        }
                    }
                }
            }));
        }
        return { userReply: '', updatedProfile: {}, endFocus: false }
    }
}