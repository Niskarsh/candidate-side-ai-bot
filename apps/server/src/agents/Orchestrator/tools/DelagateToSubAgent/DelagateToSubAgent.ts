import { Tool } from "../../../BaseAgent/Tools";
import { Orchestrator } from "../../Agent";
import { name, description, parameters } from './ToolDetails';
export class DelagateToSubAgent extends Tool {
    constructor() {
        super(
            name,
            description,
            parameters
        );
    }
    async run({
        args,
        orchestratorThread,
    }: {
        args: {
            agentName: string,
            detailedInput: string,
        },
        orchestratorThread: Orchestrator,
    }) {
        let agent = orchestratorThread.getPassedAgentFromAliveAgents(args.agentName);
        if (!agent) {
            console.log(`../../../${args.agentName}/Agent`)
            // Import correct agent dynamically
            const agentModule = await import(`../../../${args.agentName}/Agent`);
            const AgentClass = agentModule[args.agentName];
            let agentObj = new AgentClass();
            await agentObj.initTools();
            agent = {
                name: args.agentName,
                agent: agentObj,
            };
            orchestratorThread.addAgentToAliveAgents({ agentName: args.agentName, agentObj });
        }
        const  {
            userReply,
            updatedProfile,
            endFocus,
        } = await agent.agent.step(args.detailedInput);
        console.log('###################', userReply)
        return { userReply,
            focusedAgentName: args.agentName,
            focusedAgent: agent.agent,
            updatedProfile, endFocus,
        };
    };
}