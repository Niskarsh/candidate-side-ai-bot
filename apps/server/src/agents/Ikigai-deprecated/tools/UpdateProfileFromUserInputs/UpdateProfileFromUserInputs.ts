import { Tool } from "../../../BaseAgent/Tools";
import { name, description, parameters } from './ToolDetails';
export class UpdateProfileFromUserInputs extends Tool {
    constructor() {
        super(
            name,
            description,
            parameters
        );
    }
    async run({ args }: { args: any}): Promise<Record<string, any>> {
        let text = args.text;
        let extractedProfile = args.extractedProfile;
        return new Promise((resolve) => resolve({
            text,
            extractedProfile
        }));
    };
}