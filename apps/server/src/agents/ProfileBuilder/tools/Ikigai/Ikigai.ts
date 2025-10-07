import { Tool } from "../../../BaseAgent/Tools";
import { name, description, parameters, enrichLinkedIn } from './ToolDetails';
export class Ikigai extends Tool {
    linkedinUrl: string | null;
    constructor(linkedinUrl: string | null = null) {
        super(
            name,
            description,
            parameters
        );
        if (linkedinUrl) {
            this.linkedinUrl = linkedinUrl;
        } else {
            this.linkedinUrl = null;
        }
    }
    async run(args: any) {
        const result = await enrichLinkedIn(String(this.linkedinUrl));
        return result;
    };
}