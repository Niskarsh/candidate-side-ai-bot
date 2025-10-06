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
            name, description, systemPrompt, [], toolsAvailable, schemasAvailable
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
    }

    getWelcome() {
        return ['Hello! I am your Orchestrator agent, here to assist you with various tasks. How can I help you today?'];    
    }

    step(message: string) {
        this.absorbMessage(message);
        console.log('history', this.history);
        return {
            messages: ['This is a stub response from the Orchestrator agent.']
        }
    }
}