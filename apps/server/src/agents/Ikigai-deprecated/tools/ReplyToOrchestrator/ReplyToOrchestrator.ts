import { Tool } from "../../../BaseAgent/Tools";
import { name, description, parameters } from './ToolDetails';
export class ReplyToOrchestrator extends Tool {
    constructor() {
        super(
            name,
            description,
            parameters
        );
    }
    async run({ args }: { args: any}): Promise<string> {
        let text = args.text;
        return new Promise((resolve) => resolve(text)); // simulate delay
    };
}