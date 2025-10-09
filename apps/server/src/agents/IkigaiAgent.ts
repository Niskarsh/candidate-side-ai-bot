import { Agent, AgentRunResult } from "./Agent.js";
import { executeTool } from "./tools.js";
import { IKIGAI_SCENARIOS, JOB_TRAITS } from "./ikigaiData.js";

export type IkigaiState = {
  stage: 'A' | 'B' | 'C' | 'complete';
  stageA: {
    currentQuestionIndex: number;
    responses: Array<{
      question_index: number;
      traits: string[];
      most_like: number;
      least_like: number;
    }>;
    top10Traits: string[];
  };
  stageB: {
    currentQuestionIndex: number;
    responses: Array<{
      question_index: number;
      traits: string[];
      most_like: number;
      least_like: number;
    }>;
  };
  stageC: {
    currentQuestionIndex: number;
    responses: Array<{
      question_index: number;
      most_like: number;
      least_like: number;
    }>;
  };
  isComplete: boolean;
};

export class IkigaiAgent implements Agent {
  name = "IkigaiAgent";
  description = `This agent conducts a comprehensive 3-stage Ikigai assessment to understand the candidate's core values, personality traits, and purpose. It screens 40 job traits, ranks the top 10, and analyzes philosophy-of-life scenarios to determine personality type and suitable career roles.`;
  
  systemPrompt = `You are the Ikigai Agent, conducting a comprehensive 3-stage assessment to help candidates discover their purpose and ideal career path.`;

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private formatQuestionMessage(question: any): string[] {
    return [
      question.question,
      "",
      "Options:",
      ...question.options.map((opt: any) => `${opt.id}. ${opt.text}`),
      "",
      "**Reply with two numbers: MOST, LEAST** (e.g., `2,3` or `2 3`)"
    ];
  }

  private getCurrentStageATraits(questionIndex: number): string[] {
    const shuffled = this.shuffleArray(JOB_TRAITS);
    return shuffled.slice(0, 4); // Always return first 4 from shuffled array
  }

  private getCurrentStageBTraits(questionIndex: number, top10Traits: string[]): string[] {
    const shuffled = this.shuffleArray(top10Traits);
    return shuffled.slice(0, 4); // Always return first 4 from shuffled top 10
  }

  private calculateTop10Traits(stageAResponses: any[]): string[] {
    const traitScores: Record<string, number> = {};
    
    JOB_TRAITS.forEach(trait => {
      traitScores[trait] = 0;
    });
    
    stageAResponses.forEach(response => {
      const traits = response.traits;
      if (traits && traits.length === 4) {
        const mostTrait = traits[response.most_like - 1];
        const leastTrait = traits[response.least_like - 1];
        if (mostTrait) traitScores[mostTrait] += 1;
        if (leastTrait) traitScores[leastTrait] -= 1;
      }
    });
    
    return Object.entries(traitScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([trait]) => trait);
  }

  async run({ userMessage, priorProfile, history }: {
    userMessage: string;
    priorProfile?: any;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<AgentRunResult> {

    // Extract Ikigai state from prior profile or initialize
    const ikigaiState: IkigaiState = priorProfile?.ikigaiState || {
      stage: 'A',
      stageA: {
        currentQuestionIndex: 0,
        responses: [],
        top10Traits: []
      },
      stageB: {
        currentQuestionIndex: 0,
        responses: []
      },
      stageC: {
        currentQuestionIndex: 0,
        responses: []
      },
      isComplete: false
    };

    // Check if user is providing a response
    // Support multiple formats: "2,3", "2 3", "most 2 least 3", etc.
    let mostLike = 0;
    let leastLike = 0;
    
    const simpleMatch = userMessage.match(/(\d+)[,\s]+(\d+)/);
    if (simpleMatch) {
      mostLike = parseInt(simpleMatch[1]);
      leastLike = parseInt(simpleMatch[2]);
    } else {
      const keywordMatch = userMessage.match(/(?:most|best).*?(\d+).*?(?:least|worst).*?(\d+)/i);
      if (keywordMatch) {
        mostLike = parseInt(keywordMatch[1]);
        leastLike = parseInt(keywordMatch[2]);
      }
    }
    
    // Process valid responses
    if (mostLike >= 1 && mostLike <= 4 && leastLike >= 1 && leastLike <= 4 && mostLike !== leastLike) {
      if (ikigaiState.stage === 'A') {
        const currentTraits = this.getCurrentStageATraits(ikigaiState.stageA.currentQuestionIndex);
        ikigaiState.stageA.responses.push({
          question_index: ikigaiState.stageA.currentQuestionIndex,
          traits: currentTraits,
          most_like: mostLike,
          least_like: leastLike
        });
        
        ikigaiState.stageA.currentQuestionIndex++;
        
        // Check if Stage A is complete
        if (ikigaiState.stageA.currentQuestionIndex >= 12) {
          ikigaiState.stageA.top10Traits = this.calculateTop10Traits(ikigaiState.stageA.responses);
          ikigaiState.stage = 'B';
          ikigaiState.stageB.currentQuestionIndex = 0;
          
          const currentTraits = this.getCurrentStageBTraits(0, ikigaiState.stageA.top10Traits);
          const questionResult = await executeTool('ask_trait_ranking', {
            question_index: 0,
            traits: currentTraits
          });
          
          return {
            messages: [
              "✅ **Stage A Complete!**",
              "",
              "Great! Now let's move to **Stage B** to refine your top traits.",
              "",
              ...this.formatQuestionMessage(questionResult.result)
            ],
            updatedProfile: {
              ...priorProfile,
              ikigaiState
            },
            takeBackControl: false
          };
        }
        
        // Ask next Stage A question
        const nextTraits = this.getCurrentStageATraits(ikigaiState.stageA.currentQuestionIndex);
        const nextQuestion = await executeTool('ask_trait_screening', {
          question_index: ikigaiState.stageA.currentQuestionIndex,
          traits: nextTraits
        });
        
        return {
          messages: this.formatQuestionMessage(nextQuestion.result),
          updatedProfile: {
            ...priorProfile,
            ikigaiState
          },
          takeBackControl: false
        };
      } else if (ikigaiState.stage === 'B') {
        const currentTraits = this.getCurrentStageBTraits(ikigaiState.stageB.currentQuestionIndex, ikigaiState.stageA.top10Traits);
        ikigaiState.stageB.responses.push({
          question_index: ikigaiState.stageB.currentQuestionIndex,
          traits: currentTraits,
          most_like: mostLike,
          least_like: leastLike
        });
        
        ikigaiState.stageB.currentQuestionIndex++;
        
        // Check if Stage B is complete
        if (ikigaiState.stageB.currentQuestionIndex >= 10) {
          ikigaiState.stage = 'C';
          ikigaiState.stageC.currentQuestionIndex = 0;
          
          const questionResult = await executeTool('ask_philosophy_question', {
            question_index: 0
          });
          
          return {
            messages: [
              "✅ **Stage B Complete!**",
              "",
              "Excellent! Now for the final stage: **Stage C: Philosophy of Life**",
              "",
              ...this.formatQuestionMessage(questionResult.result)
            ],
            updatedProfile: {
              ...priorProfile,
              ikigaiState
            },
            takeBackControl: false
          };
        }
        
        // Ask next Stage B question
        const nextTraits = this.getCurrentStageBTraits(ikigaiState.stageB.currentQuestionIndex, ikigaiState.stageA.top10Traits);
        const nextQuestion = await executeTool('ask_trait_ranking', {
          question_index: ikigaiState.stageB.currentQuestionIndex,
          traits: nextTraits
        });
        
        return {
          messages: this.formatQuestionMessage(nextQuestion.result),
          updatedProfile: {
            ...priorProfile,
            ikigaiState
          },
          takeBackControl: false
        };
      } else if (ikigaiState.stage === 'C') {
        ikigaiState.stageC.responses.push({
          question_index: ikigaiState.stageC.currentQuestionIndex,
          most_like: mostLike,
          least_like: leastLike
        });
        
        ikigaiState.stageC.currentQuestionIndex++;
        
        // Check if Stage C is complete
        if (ikigaiState.stageC.currentQuestionIndex >= 10) {
          const analysisResult = await executeTool('analyze_complete_assessment', {
            stage_a_responses: ikigaiState.stageA.responses,
            stage_b_responses: ikigaiState.stageB.responses,
            stage_c_responses: ikigaiState.stageC.responses
          });
          
          ikigaiState.stage = 'complete';
          ikigaiState.isComplete = true;
          
          return {
            messages: [
              "🎯 **Your Complete Ikigai Profile**",
              "",
              `**Persona:** ${analysisResult.result.personaTitle}`,
              "",
              `**Your Ikigai:** ${analysisResult.result.ikigaiLine}`,
              "",
              `**Anti-Ikigai (What to Avoid):** ${analysisResult.result.antiIkigai}`,
              "",
              `**Core Drives:** ${analysisResult.result.coreDrives.join(', ')}`,
              "",
              `**Philosophy Type:** ${analysisResult.result.philosophyType}`,
              "",
              `**Ideal Environment:** ${analysisResult.result.idealEnvironment}`,
              "",
              `**Potential Watch-outs:** ${analysisResult.result.watchOuts}`,
              "",
              "**🎯 Top Recommended Roles:**",
              analysisResult.result.recommendedRoles.slice(0, 5).map((role: string, i: number) => `${i + 1}. ${role}`).join('\n')
            ],
            updatedProfile: {
              ...priorProfile,
              ikigaiState,
              ikigaiAnalysis: analysisResult.result.analysis,
              personaTitle: analysisResult.result.personaTitle,
              ikigaiLine: analysisResult.result.ikigaiLine,
              antiIkigai: analysisResult.result.antiIkigai,
              coreDrives: analysisResult.result.coreDrives,
              philosophyType: analysisResult.result.philosophyType,
              idealEnvironment: analysisResult.result.idealEnvironment,
              watchOuts: analysisResult.result.watchOuts,
              rankedTraits: analysisResult.result.rankedTraits,
              top4Traits: analysisResult.result.top4Traits,
              recommendedRoles: analysisResult.result.recommendedRoles
            },
            takeBackControl: true
          };
        }
        
        // Ask next Stage C question
        const nextQuestion = await executeTool('ask_philosophy_question', {
          question_index: ikigaiState.stageC.currentQuestionIndex
        });
        
        return {
          messages: this.formatQuestionMessage(nextQuestion.result),
          updatedProfile: {
            ...priorProfile,
            ikigaiState
          },
          takeBackControl: false
        };
      }
    }

    // Fallback - ask current question based on stage
    if (!ikigaiState.isComplete) {
      if (ikigaiState.stage === 'A') {
        const currentTraits = this.getCurrentStageATraits(ikigaiState.stageA.currentQuestionIndex);
        const questionResult = await executeTool('ask_trait_screening', {
          question_index: ikigaiState.stageA.currentQuestionIndex,
          traits: currentTraits
        });
        
        return {
          messages: this.formatQuestionMessage(questionResult.result),
          updatedProfile: {
            ...priorProfile,
            ikigaiState
          },
          takeBackControl: false
        };
      } else if (ikigaiState.stage === 'B') {
        const currentTraits = this.getCurrentStageBTraits(ikigaiState.stageB.currentQuestionIndex, ikigaiState.stageA.top10Traits);
        const questionResult = await executeTool('ask_trait_ranking', {
          question_index: ikigaiState.stageB.currentQuestionIndex,
          traits: currentTraits
        });
        
        return {
          messages: this.formatQuestionMessage(questionResult.result),
          updatedProfile: {
            ...priorProfile,
            ikigaiState
          },
          takeBackControl: false
        };
      } else if (ikigaiState.stage === 'C') {
        const questionResult = await executeTool('ask_philosophy_question', {
          question_index: ikigaiState.stageC.currentQuestionIndex
        });
        
        return {
          messages: this.formatQuestionMessage(questionResult.result),
          updatedProfile: {
            ...priorProfile,
            ikigaiState
          },
          takeBackControl: false
        };
      }
    }

    // Fallback - start assessment
    return {
      messages: [
        "🌟 **Welcome to Your Comprehensive Ikigai Assessment!**",
        "",
        "I'll guide you through a 3-stage assessment to discover your true professional strengths and personal values:",
        "",
        "**Stage A:** Trait Screening (12 questions) - We'll screen all 40 job traits to find your top 10",
        "**Stage B:** Trait Ranking (10 questions) - We'll rank your top 10 traits precisely", 
        "**Stage C:** Philosophy of Life (10 questions) - We'll explore your core values and personality",
        "",
        "For each question, reply with two numbers: MOST, LEAST (e.g., `2,3`)",
        "",
        "Ready to discover your Ikigai? Type 'yes' to begin!"
      ],
      updatedProfile: {
        ...priorProfile,
        ikigaiState: {
          stage: 'A',
          stageA: {
            currentQuestionIndex: 0,
            responses: [],
            top10Traits: []
          },
          stageB: {
            currentQuestionIndex: 0,
            responses: []
          },
          stageC: {
            currentQuestionIndex: 0,
            responses: []
          },
          isComplete: false
        }
      },
      takeBackControl: false
    };
  }
}
