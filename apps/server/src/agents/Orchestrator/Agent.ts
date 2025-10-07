import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "../BaseAgent/Agent";
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

    constructor(
        schemasAvailable?: Array<any>
    ) {
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
            schemasAvailable,
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

    async step(message: string) {
        // this.absorbMessage(message);
        console.log('Orchestrator stepping with message:', message);
        const resp = await this.run({ userMessage: message });
        console.log('history', this.history, 'resp', JSON.stringify(resp.candidates[0]));
        return {
            messages: [resp.candidates?.[0]?.content?.parts?.[0]?.text ?? ''],
            // messages: [],
        }
    }
}