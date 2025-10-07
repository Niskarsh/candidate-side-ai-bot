import { Tool } from "../../../BaseAgent/Tools";
import { name, description, parameters, enrichLinkedIn } from './ToolDetails';
export class LinkedinEnrich extends Tool {
    constructor() {
        super(
            name,
            description,
            parameters
        );
    }
    async run(args: any) {
        const result = await enrichLinkedIn(String(args.linkedinUrl));
        return result;
    };
}