import { Agent } from "../BaseAgentClass/Agent";
import { name, description, systemPrompt } from "./AgentDetails";
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

    constructor(toolsAvailable?: Array<{ name: string; description: string }>, schemasAvailable?: Array<any>
    ) {
        super(
            name, description, systemPrompt, [], toolsAvailable, schemasAvailable, 'Hello! I am your Orchestrator agent, here to assist you with various tasks. How can I help you today?'
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
        this.history.push({ role: "model", content: this.WELCOME_MESSAGE });
    }

    getWelcome() {
        return [this.WELCOME_MESSAGE];    
    }

    async step(message: string) {
        // this.absorbMessage(message);
        console.log('Orchestrator stepping with message:', message);
        const resp = await this.run({ userMessage: message });
        // console.log('history', this.history, 'resp', resp.candidates[0]);
        return {
            messages: [resp.candidates?.[0]?.content?.parts?.[0]?.text ?? ''],
            // messages: [],
        }
    }
}