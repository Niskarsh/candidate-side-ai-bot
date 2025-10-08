import { Tool } from "../../../BaseAgent/Tools";
import { dummyLinkedinData } from "./dummy";
import { name, description, parameters, enrichLinkedIn } from './ToolDetails';
export class LinkedinEnrich extends Tool {
    constructor() {
        super(
            name,
            description,
            parameters
        );
    }
    async run({ args }: { args: { linkedin_url: string }}) {
        const { linkedin_url } = args;
        // const result = await enrichLinkedIn(String(linkedin_url));
        const result = dummyLinkedinData;
        console.log(result);
        return result;
    };
}