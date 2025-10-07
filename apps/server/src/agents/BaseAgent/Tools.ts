import type { FunctionDeclaration } from "@google/genai";

export type ToolExecution = (args: any) => Promise<any>;

export type ToolSpec = {
    name: string;
    description: string;
    parameters: any;            // JSON schema-like
    run: ToolExecution;
    toFunctionDeclaration(): FunctionDeclaration;
};
export class Tool {
    name: string;
    description: string;
    parameters: any;

    constructor(name: string, description: string, parameters: any) {
        this.name = name;
        this.description = description;
        this.parameters = parameters;
        // this.run = run;
    }

    asFnDecl(spec: ToolSpec): FunctionDeclaration {
        return {
            name: spec.name,
            description: spec.description,
            parameters: spec.parameters
        };
    }
    async run(args: any) {
        // This returns data for the orchestrator/UI to surface.
        return { question: String(args.question) };
    }
    toFunctionDeclaration() { return this.asFnDecl(this); }
}