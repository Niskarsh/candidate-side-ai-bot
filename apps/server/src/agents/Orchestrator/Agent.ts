import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "../BaseAgent/Agent";
import { name, description, systemPrompt } from "./AgentDetails";
import { Candidate } from "@google/genai";
import { ProfileBuilder } from "../ProfileBuilder/Agent";
import { name as OrchestratorReplyToUserToolName } from './tools/ReplyToUser/ToolDetails';
import { name as OrchestratorDelagateToSubAgentToolName } from './tools/DelagateToSubAgent/ToolDetails';
import { Ikigai } from "../Ikigai/Agent";
export class Orchestrator extends Agent {
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
        interests: {
            details: string[],
            complete: boolean;
        },
        summary: {
            details: string | null,
            complete: boolean;
        },
        complete: boolean;
    };
    // currentState: {
    //     ikigaiCollected: boolean;
    // };
    // ikigai: {

    // }
    focusedAgent: string | null;
    aliveAgents: { name: string, agent: any }[];
    userReply: string | null;
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
        this.profile = {
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
            interests: {
                details: [],
                complete: false,
            },
            summary: {
                details: null,
                complete: false,
            },
            complete: false,
        };
        this.focusedAgent = null;
        this.aliveAgents = [];
        this.userReply = null;
        if (this.WELCOME_MESSAGE) {
            this.history.push({ role: "model", content: this.WELCOME_MESSAGE });
        }
    }

    async getSubAgentList() {
        // Add more sub-agents here as they are created
        let profileBuilder = new ProfileBuilder();
        let ikigai = new Ikigai();
        await profileBuilder.initTools();
        await ikigai.initTools();
        const subAgentList = [
            profileBuilder.agentDetails(),
            ikigai.agentDetails(),
        ];
        return subAgentList;
    }

    getFocussedAgentObject() {
        if (this.focusedAgent && this.aliveAgents) {
            return this.aliveAgents.find(agent => agent.name === this.focusedAgent);
        }
        return null;
    }

    getPassedAgentFromAliveAgents(agentName: string) {
        if (this.aliveAgents) {
            return this.aliveAgents.find(agent => agent.name === agentName);
        }
        return null;
    }

    addAgentToAliveAgents({ agentName, agentObj }: { agentName: string, agentObj: any }) {
        if (this.aliveAgents) {
            this.aliveAgents.push({
                name: agentName,
                agent: agentObj,
            });
        }
    }

    updatestate({ profile: updatedProfile }: { profile?: any }) {
        if (updatedProfile) {
            // Only update sections of profile if complete is false for that section
            for (let sectionKey of Object.keys(this.profile)) {
                if (sectionKey in updatedProfile) {
                    if (sectionKey === 'complete') continue;
                    if (!this.profile[sectionKey as keyof typeof this.profile].complete) {
                        this.profile[sectionKey as keyof typeof this.profile] = updatedProfile[sectionKey as keyof typeof this.profile];
                    }
                }
            }
            // After updating all sections, check if overall profile is complete
            this.profile.complete = Object.keys(this.profile).every(sectionKey => {
                if (sectionKey === 'complete') return true;
                const section = this.profile[sectionKey as keyof typeof this.profile];
                return typeof section === 'object' && section !== null && 'complete' in section && section.complete;
            });

        }
    }

    handleEndFocus({ endFocus }: { endFocus: boolean }) {
        if (endFocus) {
            this.focusedAgent = null;
        }
    }

    async step(message: string) {

        // If focussed agent is set, and alive, delegate to it directly
        if (this.focusedAgent) {
            console.log('Delegating to focussed agent:', this.focusedAgent);
            let focussedAgent = this.getFocussedAgentObject();
            if (focussedAgent) {
                this.absorbMessage(message);
                await focussedAgent.agent.step(message, this);
                if (this.userReply) {
                    this.absorbMessage(this.userReply, 'model');
                }
                return {
                    messages: [this.userReply],
                    // messages: [],
                }
            }
            throw new Error("Focussed agent delegation not implemented yet.");
        }

        console.log('Orchestrator stepping with message:', message);
        let subAgentList = await this.getSubAgentList();
        const response = await this.run({
            userMessage: message,
            priorProfile: this.profile,
            subAgents: subAgentList,
            // absorbMessage: false,
        });
        console.log('Orchestrator run response:', JSON.stringify(response));
        let responseText = '';
        let functionCall = response.candidates[0].content?.parts[0].functionCall;
        if (functionCall) {

            if (response.candidates) {
                if (functionCall.name) {
                    switch (functionCall.name) {
                        case OrchestratorReplyToUserToolName: {
                            let functionTool = this.fetchToolObjByName(functionCall.name);
                            let functionResponseText = await functionTool.run({
                                args: functionCall.args,
                                orchestratorThread: this,
                            });
                            this.userReply = functionResponseText;
                            break;
                        }
                        case OrchestratorDelagateToSubAgentToolName: {
                            let functionTool = this.fetchToolObjByName(functionCall.name);
                            let { focusedAgentName, focusedAgent } = await functionTool.run({
                                args: functionCall.args,
                                orchestratorThread: this,
                            });
                            // console.log('Delegation function call response:', userReply, focusedAgentName, focusedAgent, updatedProfile, endFocus);
                            // If focussed agent is not present in alive agents, then add to alive agents
                            if (focusedAgent) {
                                let focussedAgentObj = this.getFocussedAgentObject();
                                if (!focussedAgentObj) {
                                    this.aliveAgents.push({
                                        name: focusedAgentName,
                                        agent: focusedAgent,
                                    });
                                }
                                this.focusedAgent = focusedAgentName;
                            }
                            break;
                        }
                    }

                }
            }
        }
        if (this.userReply) {
            this.absorbMessage(this.userReply, 'model');
        }
        return {
            messages: [responseText],
            // messages: [],
        }
    }
}