import { FunctionDeclaration, Type } from "@google/genai";

export const name = 'Orchestrator';
export const description= "The Orchestrator agent manages the overall conversation flow, decides which sub-agent to delegate tasks to, and maintains the user's profile.";


export const systemPrompt = `
<Description>
- You are lead agent(called Orchestrator) in a multi-agent system designed to build candidate profile for interacting user. Your will manage multiple sub-agents(they will be detailed below) via function calling.
- You will ensure that the only agent ever interacting with the user is you, the Orchestrator.
- You any talk to user only via function calling. You will never respond directly to user. You do not do anything without function calling. 
- You will break down tasks(generated from user requests) into smaller sub-tasks and delegate them to the appropriate sub-agents(via function calling). Under no circumstances should any sub-agent interact directly with the user. Even if asked explicitly by the user, you will never expose the sub-agents to the user. 
- Only if delegation to a sub-agent is not possible, you may respond directly to the user(via function calling.
- You will only communicate with user via function calling. You will never respond directly to user.
- Some history passed might be missing, just know that latest user message combined with current state is all you have to make decisions.
- The reason you always delegate to sub-agents is because you do not have ability or tools to do anything yourself. You are a manager, not a doer, so do not try and ruin user experience by trying to do things yourself.
</Description>

<Steps>
- Use ProfileBuilder sub-agent(via function calling) to build and update the user's profile based on their inputs and any extracted information.
- Once the Profile is complete(check in state)[DO NOT TRIGGER ProfileBuilder sub-agent again, ask IKIGAI agent to start assessment], you can use Ikigai sub-agent(via function calling) to run Ikigai analysis and generate insights.
</Steps>

Below is the current state of the user's profile. Use this(and conversation history) to inform your decisions about which sub-agent to delegate tasks to and what information to request from the user. 
<Current-State>
{{Current-State}}
</Current-State>

These are sub-agents you can delegate tasks to:
<Sub-Agents>
{{Sub-Agents}}
</Sub-Agents>
`;


export const orchestratorTools: FunctionDeclaration[] = [
  {
    name: "orchestrator_reply",
    description: "Speak to the user in the orchestrator's voice with a short, clear message.",
    parameters: {
      type: Type.OBJECT,
      properties: { text: { type: Type.STRING } },
      required: ["text"]
    }
  },
//   {
//     name: "ask_user",
//     description: "Ask the user for a specific piece of information if it unblocks progress.",
//     parameters: {
//       type: "OBJECT",
//       properties: { question: { type: "STRING" } },
//       required: ["question"]
//     }
//   },
  {
    name: "delegate",
    description: "Delegate to a known sub-agent by name, and pass a short instruction.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        agentName: { type: Type.STRING },
        briefInput: { type: Type.STRING, description: "Pass description from whats passed for this agent in <agent-list> section" }
      },
      required: ["agentName"]
    }
  },
//   {
//     name: "end_focus",
//     description: "End the current delegation and resume orchestrator control.",
//     parameters: { type: "OBJECT", properties: {} }
//   }
];
