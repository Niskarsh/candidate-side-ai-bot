import type { FunctionDeclaration } from "@google/generative-ai";
import { enrichLinkedIn } from "../services/linkedin.js";
import { dummyLinkedIn } from "./dummy.js";
import { IKIGAI_SCENARIOS, analyzeIkigaiResults, analyzeCompleteAssessment, JOB_TRAITS, TRAIT_BEHAVIORS } from "./ikigaiData.js";

export type ToolExecution = (args: any) => Promise<any>;
export type ToolSpec = {
  name: string;
  description: string;
  parameters: any;            // JSON schema-like
  run: ToolExecution;
  toFunctionDeclaration(): FunctionDeclaration;
};

function asFnDecl(spec: ToolSpec): FunctionDeclaration {
  return {
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters
  };
}

// Tool 1: LinkedIn enrichment (server-side)
export const linkedinTool: ToolSpec = {
  name: "linkedin_enrich",
  description: "Fetch and normalize a candidate profile from a LinkedIn public URL.",
  parameters: {
    type: "OBJECT",
    properties: {
      linkedin_url: { type: "STRING", description: "Public LinkedIn profile URL" }
    },
    required: ["linkedin_url"]
  },
  async run(args: any) {
    const result = await enrichLinkedIn(String(args.linkedin_url));
    return result;
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 2: Ask user a question (delegated via orchestrator)
export const askUserTool: ToolSpec = {
  name: "emit_question",
  description: "Ask the candidate for a missing field (e.g., LinkedIn URL, email).",
  parameters: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING", description: "Plain-language question for the user." }
    },
    required: ["question"]
  },
  async run(args: any) {
    // This returns data for the orchestrator/UI to surface.
    return { question: String(args.question) };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 3: Generate simple profile summary
export const profileOverviewTool: ToolSpec = {
  name: "generate_overview",
  description: "Generate a concise 20-word summary of the LinkedIn profile.",
  parameters: {
    type: "OBJECT",
    properties: {
      profile_data: { type: "OBJECT", description: "The enriched profile data from LinkedIn" }
    },
    required: ["profile_data"]
  },
  async run(args: any) {
    // Handle both nested data structure and flat structure
    const profile = args.profile_data?.data || args.profile_data;
    
    // Extract key information
    const name = profile.full_name || profile.first_name || "Professional";
    const headline = profile.headline || profile.job_title || "experienced professional";
    const company = profile.company || "current company";
    const yearsExp = profile.experiences?.length || 0;
    
    // Handle skills - could be string or array
    let skillsList = [];
    if (typeof profile.skills === 'string') {
      skillsList = profile.skills.split('|').slice(0, 3);
    } else if (Array.isArray(profile.skills)) {
      skillsList = profile.skills.slice(0, 3);
    }
    const topSkills = skillsList.join(', ') || "various skills";
    
    // Generate 20-word summary
    const summary = `${name}: ${headline} at ${company}. ${yearsExp}+ roles. Skilled in ${topSkills}. Ready for growth.`;
    
    return { overview: summary };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 4: Ask Ikigai question
export const ikigaiQuestionTool: ToolSpec = {
  name: "ask_ikigai_question",
  description: "Ask a philosophy-of-life question to understand the candidate's Ikigai (purpose and values).",
  parameters: {
    type: "OBJECT",
    properties: {
      question_index: { type: "INTEGER", description: "Index of the question to ask (0-based)" }
    },
    required: ["question_index"]
  },
  async run(args: any) {
    const index = Number(args.question_index);
    const scenario = IKIGAI_SCENARIOS[index];
    
    if (!scenario) {
      throw new Error(`Invalid question index: ${index}`);
    }
    
    return {
      question: scenario.text,
      options: scenario.options.map((opt, i) => ({
        id: i + 1,
        text: opt.text
      })),
      totalQuestions: IKIGAI_SCENARIOS.length
    };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 5: Analyze Ikigai responses
export const ikigaiAnalysisTool: ToolSpec = {
  name: "analyze_ikigai_responses",
  description: "Analyze the candidate's Ikigai responses to determine their personality type and suitable roles.",
  parameters: {
    type: "OBJECT",
    properties: {
      responses: { 
        type: "ARRAY", 
        items: {
          type: "OBJECT",
          properties: {
            question_index: { type: "INTEGER" },
            most_like: { type: "INTEGER" },
            least_like: { type: "INTEGER" }
          }
        },
        description: "Array of responses to Ikigai questions"
      }
    },
    required: ["responses"]
  },
  async run(args: any) {
    const responses = args.responses;
    const poleScores: Record<string, number> = {};
    
    // Process each response
    responses.forEach((response: any) => {
      const scenario = IKIGAI_SCENARIOS[response.question_index];
      if (!scenario) return;
      
      // Apply scoring: Most = +1, Least = -1
      const mostOption = scenario.options[response.most_like - 1];
      const leastOption = scenario.options[response.least_like - 1];
      
      if (mostOption) {
        poleScores[mostOption.pole] = (poleScores[mostOption.pole] || 0) + 1;
      }
      if (leastOption) {
        poleScores[leastOption.pole] = (poleScores[leastOption.pole] || 0) - 1;
      }
    });
    
    // Analyze results
    const analysis = analyzeIkigaiResults(poleScores);
    
    // Generate personalized insights
    const ikigaiDescription = `Your Ikigai reveals a ${analysis.personalityType} personality. ` +
      `You tend to be more ${analysis.philosophyRanking[0]} and ${analysis.philosophyRanking[1]}, ` +
      `which suggests you thrive in environments that value these qualities.`;
    
    const roleInsights = `Based on your responses, you would be well-suited for roles like: ` +
      `${analysis.recommendedRoles.slice(0, 3).join(', ')}. ` +
      `These positions align with your natural tendencies and would allow you to work in ways that feel authentic and fulfilling.`;
    
    return {
      analysis,
      ikigaiDescription,
      roleInsights,
      recommendedRoles: analysis.recommendedRoles
    };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 6: Ask trait screening question (Stage A)
export const traitScreeningTool: ToolSpec = {
  name: "ask_trait_screening",
  description: "Ask behavioral questions to screen the 40 job traits and identify top 10.",
  parameters: {
    type: "OBJECT",
    properties: {
      question_index: { type: "INTEGER", description: "Index of the screening question (0-based)" },
      traits: { type: "ARRAY", items: { type: "STRING" }, description: "The 4 traits being evaluated in this question" }
    },
    required: ["question_index", "traits"]
  },
  async run(args: any) {
    const index = Number(args.question_index);
    const traits = args.traits;
    
    if (!traits || traits.length !== 4) {
      throw new Error("Must provide exactly 4 traits for screening");
    }
    
    // Get behavioral statements for each trait
    const options = traits.map((trait: string, i: number) => {
      const behaviors = TRAIT_BEHAVIORS[trait as keyof typeof TRAIT_BEHAVIORS] || [trait];
      const statement = behaviors[Math.floor(Math.random() * behaviors.length)];
      return {
        id: i + 1,
        text: statement,
        trait: trait
      };
    });
    
    return {
      question: `**Stage A: Trait Screening** (Question ${index + 1}/12)\n\nChoose which statement is MOST like you and which is LEAST like you:`,
      options: options,
      totalQuestions: 12
    };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 7: Ask trait ranking question (Stage B)
export const traitRankingTool: ToolSpec = {
  name: "ask_trait_ranking",
  description: "Ask behavioral questions to rank the top 10 traits identified in Stage A.",
  parameters: {
    type: "OBJECT",
    properties: {
      question_index: { type: "INTEGER", description: "Index of the ranking question (0-based)" },
      traits: { type: "ARRAY", items: { type: "STRING" }, description: "The 4 traits being ranked in this question" }
    },
    required: ["question_index", "traits"]
  },
  async run(args: any) {
    const index = Number(args.question_index);
    const traits = args.traits;
    
    if (!traits || traits.length !== 4) {
      throw new Error("Must provide exactly 4 traits for ranking");
    }
    
    // Get behavioral statements for each trait
    const options = traits.map((trait: string, i: number) => {
      const behaviors = TRAIT_BEHAVIORS[trait as keyof typeof TRAIT_BEHAVIORS] || [trait];
      const statement = behaviors[Math.floor(Math.random() * behaviors.length)];
      return {
        id: i + 1,
        text: statement,
        trait: trait
      };
    });
    
    return {
      question: `**Stage B: Trait Ranking** (Question ${index + 1}/10)\n\nChoose which statement is MOST like you and which is LEAST like you:`,
      options: options,
      totalQuestions: 10
    };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Tool 8: Ask philosophy question (Stage C)
export const philosophyQuestionTool: ToolSpec = {
  name: "ask_philosophy_question",
  description: "Ask philosophy-of-life questions to understand personality axes.",
  parameters: {
    type: "OBJECT",
    properties: {
      question_index: { type: "INTEGER", description: "Index of the philosophy question (0-based)" }
    },
    required: ["question_index"]
  },
  async run(args: any) {
    const index = Number(args.question_index);
    const scenario = IKIGAI_SCENARIOS[index];
    
    if (!scenario) {
      throw new Error(`Invalid question index: ${index}`);
    }
    
    return {
      question: `**Stage C: Philosophy of Life** (Question ${index + 1}/${IKIGAI_SCENARIOS.length})\n\n${scenario.text}`,
      options: scenario.options.map((opt, i) => ({
        id: i + 1,
        text: opt.text
      })),
      totalQuestions: IKIGAI_SCENARIOS.length
    };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

// Helper functions for Ikigai analysis
function generatePersonaTitle(top4Traits: string[], philosophyRanking: string[]): string {
  const personaTitles: Record<string, string> = {
    "Logic-Pragmatism": "The Logical Executor",
    "Logic-Idealism": "The Visionary Architect",
    "Empathy-Pragmatism": "The Practical Connector",
    "Empathy-Idealism": "The Purpose-Driven Leader",
    "Extraversion-Logic": "The Strategic Communicator",
    "Extraversion-Empathy": "The People Champion",
    "Introversion-Logic": "The Deep Thinker",
    "Introversion-Empathy": "The Thoughtful Advisor"
  };
  
  const key = `${philosophyRanking[0]}-${philosophyRanking[1]}`;
  return personaTitles[key] || `The ${top4Traits[0]} ${philosophyRanking[0]}`;
}

function getIkigaiAction(top4Traits: string[]): string {
  const actions: Record<string, string> = {
    "Logic": "solving complex problems",
    "Creativity": "building innovative solutions",
    "Mastery": "perfecting your craft",
    "Determination": "pushing through challenges",
    "Collaboration": "working with diverse teams",
    "Independence": "working autonomously",
    "Pragmatism": "delivering practical results",
    "Empathy": "understanding and helping others"
  };
  
  return actions[top4Traits[0]] || "pursuing meaningful work";
}

function generateAntiIkigai(top4Traits: string[], philosophyRanking: string[]): string {
  const antiPatterns: Record<string, string> = {
    "Logic": "Avoid roles requiring constant emotional labor without analytical depth",
    "Empathy": "Avoid purely data-driven roles with no human interaction",
    "Pragmatism": "Avoid theoretical work with no practical application",
    "Idealism": "Avoid purely transactional work with no higher purpose",
    "Extraversion": "Avoid isolated work with minimal collaboration",
    "Introversion": "Avoid constant high-energy social interaction without reflection time"
  };
  
  return antiPatterns[top4Traits[0]] || antiPatterns[philosophyRanking[0]] || "Avoid roles that don't align with your core strengths";
}

function generateIdealEnvironment(top4Traits: string[], philosophyRanking: string[]): string {
  const environments: Record<string, string> = {
    "Logic-Pragmatism": "Self-driven teams that value efficiency, autonomy, and measurable progress",
    "Logic-Idealism": "Innovative teams working on meaningful problems with clear vision",
    "Empathy-Pragmatism": "Collaborative teams focused on practical solutions that help people",
    "Empathy-Idealism": "Purpose-driven organizations with strong values and social impact",
    "Extraversion-Logic": "Dynamic teams with structured processes and open communication",
    "Extraversion-Empathy": "People-focused environments with strong team culture",
    "Introversion-Logic": "Focused environments with deep work time and analytical challenges",
    "Introversion-Empathy": "Supportive teams with meaningful one-on-one connections"
  };
  
  const key = `${philosophyRanking[0]}-${philosophyRanking[1]}`;
  return environments[key] || "Teams that value your unique strengths and working style";
}

function generateWatchOuts(top4Traits: string[], philosophyRanking: string[]): string {
  const watchOuts: Record<string, string> = {
    "Logic": "Over-analyzing, undervaluing emotional intelligence",
    "Empathy": "Over-accommodating, difficulty with tough decisions",
    "Pragmatism": "Short-term focus, missing long-term vision",
    "Idealism": "Perfectionism, difficulty with compromise",
    "Strictness": "Over-structuring, inflexibility",
    "Relaxedness": "Under-planning, missed deadlines",
    "Extraversion": "Over-committing to social obligations",
    "Introversion": "Under-networking, isolation"
  };
  
  const warnings = [
    watchOuts[top4Traits[0]],
    watchOuts[philosophyRanking[0]]
  ].filter(Boolean).join(', ');
  
  return warnings || "Balance your strengths with complementary skills";
}

// Tool 9: Complete assessment analysis
export const completeAssessmentAnalysisTool: ToolSpec = {
  name: "analyze_complete_assessment",
  description: "Analyze the complete 3-stage assessment to provide comprehensive personality and career insights.",
  parameters: {
    type: "OBJECT",
    properties: {
      stage_a_responses: { 
        type: "ARRAY", 
        items: { type: "OBJECT" },
        description: "Responses from Stage A trait screening" 
      },
      stage_b_responses: { 
        type: "ARRAY", 
        items: { type: "OBJECT" },
        description: "Responses from Stage B trait ranking" 
      },
      stage_c_responses: { 
        type: "ARRAY", 
        items: { type: "OBJECT" },
        description: "Responses from Stage C philosophy questions" 
      }
    },
    required: ["stage_a_responses", "stage_b_responses", "stage_c_responses"]
  },
  async run(args: any) {
    const stageA = args.stage_a_responses;
    const stageB = args.stage_b_responses;
    const stageC = args.stage_c_responses;
    
    // Process Stage A & B trait scores
    const traitScores: Record<string, number> = {};
    
    // Initialize all traits with 0
    JOB_TRAITS.forEach(trait => {
      traitScores[trait] = 0;
    });
    
    // Process Stage A responses
    stageA.forEach((response: any) => {
      const traits = response.traits;
      if (traits && traits.length === 4) {
        const mostTrait = traits[response.most_like - 1];
        const leastTrait = traits[response.least_like - 1];
        if (mostTrait) traitScores[mostTrait] += 1;
        if (leastTrait) traitScores[leastTrait] -= 1;
      }
    });
    
    // Process Stage B responses (weighted 1.5x)
    stageB.forEach((response: any) => {
      const traits = response.traits;
      if (traits && traits.length === 4) {
        const mostTrait = traits[response.most_like - 1];
        const leastTrait = traits[response.least_like - 1];
        if (mostTrait) traitScores[mostTrait] += 1.5;
        if (leastTrait) traitScores[leastTrait] -= 1.5;
      }
    });
    
    // Process Stage C philosophy scores
    const philosophyScores: Record<string, number> = {};
    stageC.forEach((response: any) => {
      const scenario = IKIGAI_SCENARIOS[response.question_index];
      if (scenario) {
        const mostOption = scenario.options[response.most_like - 1];
        const leastOption = scenario.options[response.least_like - 1];
        if (mostOption) {
          philosophyScores[mostOption.pole] = (philosophyScores[mostOption.pole] || 0) + 1;
        }
        if (leastOption) {
          philosophyScores[leastOption.pole] = (philosophyScores[leastOption.pole] || 0) - 1;
        }
      }
    });
    
    // Analyze complete assessment
    const analysis = analyzeCompleteAssessment(traitScores, philosophyScores);
    
    // Generate Persona Title based on top traits and philosophy
    const personaTitle = generatePersonaTitle(analysis.top4Traits, analysis.philosophyRanking);
    
    // Generate Ikigai Line
    const ikigaiLine = `You thrive when ${getIkigaiAction(analysis.top4Traits)} that balance ${analysis.philosophyRanking[0].toLowerCase()}, ${analysis.philosophyRanking[1].toLowerCase()}, and ${analysis.top4Traits[0].toLowerCase()}.`;
    
    // Generate Anti-Ikigai
    const antiIkigai = generateAntiIkigai(analysis.top4Traits, analysis.philosophyRanking);
    
    // Core Drives from top 4 traits
    const coreDrives = analysis.top4Traits.slice(0, 3);
    
    // Philosophy Type
    const philosophyType = `${analysis.philosophyRanking[0]} ${analysis.philosophyRanking[1]}`;
    
    // Ideal Environment
    const idealEnvironment = generateIdealEnvironment(analysis.top4Traits, analysis.philosophyRanking);
    
    // Potential Watch-outs
    const watchOuts = generateWatchOuts(analysis.top4Traits, analysis.philosophyRanking);
    
    return {
      analysis,
      personaTitle,
      ikigaiLine,
      antiIkigai,
      coreDrives,
      philosophyType,
      idealEnvironment,
      watchOuts,
      rankedTraits: analysis.rankedTraits,
      top4Traits: analysis.top4Traits,
      recommendedRoles: analysis.recommendedRoles
    };
  },
  toFunctionDeclaration() { return asFnDecl(this); }
};

export const TOOLBOX: ToolSpec[] = [
  linkedinTool, 
  askUserTool, 
  profileOverviewTool, 
  ikigaiQuestionTool, 
  ikigaiAnalysisTool,
  traitScreeningTool,
  traitRankingTool,
  philosophyQuestionTool,
  completeAssessmentAnalysisTool
];
export const toolDeclarations = TOOLBOX.map(t => t.toFunctionDeclaration());
export async function executeTool(name: string, args: any) {
  if (name === 'linkedin_enrich') {
    // Use real LinkedIn API instead of dummy data
    const result = await linkedinTool.run(args);
    return { name, result };
  }
  const t = TOOLBOX.find(x => x.name === name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  const result = await t.run(args);
  return { name, result };
}



