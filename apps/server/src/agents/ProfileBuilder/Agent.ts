import path from "path";
import { fileURLToPath } from "node:url";
import { Agent } from "../BaseAgent/Agent";
import { name, description, systemPrompt } from "./AgentDetails";
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
        console.log('Orchestrator stepping with message:', message);
        const resp = await this.run({ userMessage: message });
        // console.log('history', this.history, 'resp', resp.candidates[0]);
        return {
            messages: [resp],
            // messages: [],
        }
    }
}