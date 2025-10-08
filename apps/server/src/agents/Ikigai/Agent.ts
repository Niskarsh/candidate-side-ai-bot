import path from "path";
import { fileURLToPath } from "node:url";
import { Agent } from "../BaseAgent/Agent";
import { name, description, systemPrompt } from "./AgentDetails";
import { Candidate } from "@google/genai";
import { name as ProfileBuilderIkigaiToolName } from './tools/Ikigai/ToolDetails';
import { name as ProfileBuilderReplyToOrchestratorToolName } from './tools/ReplyToOrchestrator/ToolDetails';
import { name as ProfileBuilderUpdateProfileFromUserInputsToolName } from './tools/UpdateProfileFromUserInputs/ToolDetails';
import { geminiGenAI } from "../../services/gemini";
import { IkigaiQuestionReturnSchema } from "./Schemas";
export class Ikigai extends Agent {
    ikigai: {
        questions: {
            question: string,
            options: string[],
            answer: string
        }[]
        questionsDone: number,
    }

    constructor(toolsAvailable?: Array<{ name: string; description: string }>, schemasAvailable?: Array<any>
    ) {
        // @ts-expect-error The 'import.meta' meta-property is only allowed
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const toolsDir = path.resolve(__dirname, "tools");
        super(
            name, description, systemPrompt, [], '', toolsDir
        );
        this.ikigai = {
            questions: [],
            questionsDone: 0,
        }
        
        if (this.WELCOME_MESSAGE) {
            this.history.push({ role: "model", content: this.WELCOME_MESSAGE });
        }
    }

    async step(message: string) {
        // this.absorbMessage(message);
        console.log('Ikigai stepping with message:', message);
        const response = await this.run({ userMessage: message, ikigaiExerciseState: this.ikigai,
            config: {
                responseMimeType: "application/json",
                responseSchema: IkigaiQuestionReturnSchema,
            }
        });
        console.log('Ikigai run response:', JSON.stringify(response));
        let responseText = '';
        let functionCall = response.candidates[0].content?.parts[0].functionCall;
        if (functionCall) {
            if (functionCall.name) {
                switch (functionCall.name) {
                    case ProfileBuilderIkigaiToolName: {
                        let functionTool = this.fetchToolObjByName(functionCall.name);
                        let linkedInData = await functionTool.run({ args: functionCall.args });
                        this.currentState.linkedinDataPulled = true;
                        this.history.push(response.candidates[0].content)
                        // Create a function response part
                        const function_response_part = {
                            name: ProfileBuilderLinkedinEnrichToolName,
                            response: { result: linkedInData }
                        }
                        this.history.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });
                        let updatedSystemPrompt = this.systemPrompt.replace("{{Current-State}}", JSON.stringify(this.currentState.profile || {}));
                        const postToolCall = await geminiGenAI({
                            // model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
                            model: 'gemini-2.0-flash',
                            messages: this.history,
                            system_instruction: updatedSystemPrompt,
                            // tools: this.toolsAvailable,
                            config: {
                                responseMimeType: "application/json",
                                responseSchema: ProfileBuilderReturnSchema,
                            },
                        });
                        let finalResp = JSON.parse(postToolCall.candidates[0].content?.parts[0].text);
                        this.currentState.profile = finalResp.updatedProfile;
                        console.log('^^^^^^^^^^^^^^^^^^^^', finalResp.userReply, finalResp.endFocus);
                        return {
                            updatedProfile: finalResp.updatedProfile,
                            userReply: finalResp.userReply,
                            endFocus: finalResp.endFocus,
                        }
                        break;
                    }
                    case ProfileBuilderReplyToOrchestratorToolName: {
                        let functionTool = this.fetchToolObjByName(functionCall.name);
                        let orchestratorReply = await functionTool.run({ args: functionCall.args });
                        this.history.push(response.candidates[0].content)
                        // Create a function response part
                        const function_response_part = {
                            name: ProfileBuilderLinkedinEnrichToolName,
                            response: { result: orchestratorReply }
                        }
                        this.history.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });
                        let updatedSystemPrompt = this.systemPrompt.replace("{{Current-State}}", JSON.stringify(this.currentState.profile || {}));
                        const postToolCall = await geminiGenAI({
                            // model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
                            model: 'gemini-2.0-flash',
                            messages: this.history,
                            system_instruction: updatedSystemPrompt,
                            // tools: this.toolsAvailable,
                            config: {
                                responseMimeType: "application/json",
                                responseSchema: ProfileBuilderReturnSchema,
                            },
                        });
                        let finalResp = JSON.parse(postToolCall.candidates[0].content?.parts[0].text);
                        this.currentState.profile = finalResp.updatedProfile;
                        console.log('^^^^^^^^^^^^^^^^^^^^', finalResp.userReply, finalResp.endFocus);
                        return {
                            updatedProfile: finalResp.updatedProfile,
                            userReply: finalResp.userReply,
                            endFocus: finalResp.endFocus,
                        }
                        break;
                    }
                    case ProfileBuilderUpdateProfileFromUserInputsToolName: {
                        let functionTool = this.fetchToolObjByName(functionCall.name);
                        let { text: orchestratorReply, extractedProfile } = await functionTool.run({ args: functionCall.args });
                        // Merge extractedProfile into currentState.profile
                        if (extractedProfile) {
                            for (let key of Object.keys(extractedProfile)) {
                                if (this.currentState.profile.hasOwnProperty(key)) {
                                    // @ts-ignore
                                    if (typeof this.currentState.profile[key].details === 'object' && !Array.isArray(this.currentState.profile[key].details)) {
                                        // @ts-ignore
                                        this.currentState.profile[key].details = { ...this.currentState.profile[key].details, ...extractedProfile[key] };
                                    } else {
                                        // @ts-ignore
                                        this.currentState.profile[key].details = extractedProfile[key];
                                    }
                                    // @ts-ignore
                                    if (extractedProfile[key] && (Array.isArray(extractedProfile[key]) || typeof extractedProfile[key] === 'string')) {
                                        // @ts-ignore
                                        this.currentState.profile[key].complete = true;
                                    }
                                }
                            }
                        }
                        this.history.push(response.candidates[0].content)
                        // Create a function response part
                        const function_response_part = {
                            name: ProfileBuilderUpdateProfileFromUserInputsToolName,
                            response: { result: { text: orchestratorReply, extractedProfile } }
                        }
                        this.history.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });
                        let updatedSystemPrompt = this.systemPrompt.replace("{{Current-State}}", JSON.stringify(this.currentState.profile || {}));
                        const postToolCall = await geminiGenAI({
                            // model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
                            model: 'gemini-2.0-flash',
                            messages: this.history,
                            system_instruction: updatedSystemPrompt,
                            // tools: this.toolsAvailable,
                            config: {
                                responseMimeType: "application/json",
                                responseSchema: ProfileBuilderReturnSchema,
                            },
                        });
                        let finalResp = JSON.parse(postToolCall.candidates[0].content?.parts[0].text);
                        this.currentState.profile = finalResp.updatedProfile;
                        console.log('^^^^^^^^^^^^^^^^^^^^', finalResp.userReply, finalResp.endFocus);
                        return {
                            updatedProfile: finalResp.updatedProfile,
                            userReply: finalResp.userReply,
                            endFocus: finalResp.endFocus,
                        }
                        break;
                    }
                }

            }
        }
        return { userReply: '', updatedProfile: {}, endFocus: false }
    }
}