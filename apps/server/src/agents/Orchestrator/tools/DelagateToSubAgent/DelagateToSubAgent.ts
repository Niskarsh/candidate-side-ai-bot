import { Tool } from "../../../BaseAgent/Tools";
import { name, description, parameters } from './ToolDetails';
export class DelagateToSubAgent extends Tool {
    constructor() {
        super(
            name,
            description,
            parameters
        );
    }
    async run(args: any) {
        
        throw new Error("Method not implemented.");
        return;
    };
}