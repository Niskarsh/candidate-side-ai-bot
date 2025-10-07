import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "../BaseAgent/Agent";
import { name, description, systemPrompt } from "./AgentDetails";
import { Candidate } from "@google/genai";
import { ProfileBuilder } from "../ProfileBuilder/Agent";
export class Orchestrator extends Agent {
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
        focusedAgent: string | null;
        aliveAgents?: any[];
    };

    constructor() {
        // @ts-expect-error The 'import.meta' meta-property is only allowed
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const toolsDir = path.resolve(__dirname, "tools");

        super(
            name,
            description,
            systemPrompt,
            [],
            // orchestratorTools,
            // schemasAvailable,
            'Hello! I am your Orchestrator agent, here to assist you with various tasks. How can I help you today?',
            toolsDir, // toolsDir
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
            focusedAgent: null,
        };
        if (this.WELCOME_MESSAGE) {
            this.history.push({ role: "model", content: this.WELCOME_MESSAGE });
        }
    }

    async getSubAgentList() {
        // Add more sub-agents here as they are created
        let profileBuilder = new ProfileBuilder();
        await profileBuilder.initTools();
        const subAgentList = [
            profileBuilder.agentDetails(),
        ];
        return subAgentList;
    }
    async step(message: string) {
        // this.absorbMessage(message);
        console.log('Orchestrator stepping with message:', message);
        let subAgentList = await this.getSubAgentList();
        const response = await this.run({
            userMessage: message,
            priorProfile: this.currentState.profile,
            subAgents: subAgentList,
        });
        console.log('Orchestrator run response:', JSON.stringify(response));
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
                                    let functionTool = this.fetchToolObjByName(part.functionCall.name);
                                    let functionResponseText = await functionTool.run(part.functionCall.args);
                                    // console.log('Function call response:', functionResponseText);
                                    responseText += functionResponseText;
                                }
                            }
                        }
                    }
                }
            }));
        }
        this.history.push({ role: "model", content: responseText });

        console.log('history', this.history, 'resp', responseText);
        return {
            messages: [responseText],
            // messages: [],
        }
    }
}