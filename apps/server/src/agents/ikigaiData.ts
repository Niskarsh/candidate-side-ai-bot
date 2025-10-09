// Complete assessment data extracted from what-you-love.js

// 40 Job Traits
export const JOB_TRAITS = [
  "Accountability","Ambition","Approachableness","Assertiveness","Autonomy","Calmness","Collaboration",
  "Competition","Concentration","Creativity","Curiosity","Delegation","Determination","Diligence","Eloquence",
  "Empathy","Flexibility","Frankness","Honesty","Improvisation","Independence","Insightfulness","Integrity",
  "Kindness","Logic","Mastery","Meticulousness","Open-mindedness","Organization","Patience","Persuasiveness",
  "Compliance","Punctuality","Reliability","Resilience","Resourcefulness","Self-Discipline","Self-Reliance",
  "Sociability","Uniformity"
];

// Each trait mapped to 2+ behavioral statements
export const TRAIT_BEHAVIORS = {
  Accountability: ["I own up to my mistakes and fix them.","I admit when I'm wrong and explain how I'll do better."],
  Ambition: ["I set big goals and work hard to reach them.","I go after jobs or projects that challenge me to grow."],
  Approachableness: ["People find it easy to come up and talk to me.","New people at work usually ask me questions first."],
  Assertiveness: ["I tell people what I need, even if they disagree.","I speak up quickly when things are going wrong."],
  Autonomy: ["I like to decide my own plan and get it done.","I work best when I control my own schedule and methods."],
  Calmness: ["I stay calm when things go wrong.","I help calm down other people when they get upset."],
  Collaboration: ["I bring people together and get everyone on the same page.","I share information and make space for others to contribute."],
  Competition: ["I get excited by games and scoreboards.","I try harder when there's a chance to win."],
  Concentration: ["I can focus deeply for long periods of time.","Background noise doesn't bother me when I'm working."],
  Creativity: ["I like to imagine how things could be different.","I connect ideas in unusual ways to solve problems."],
  Curiosity: ["I keep asking why until I understand completely.","I test ideas just to see what happens."],
  Delegation: ["I give tasks to others so the whole team moves faster.","I match tasks to people's strengths."],
  Determination: ["I keep working even when progress is slow.","I push through when results take longer than expected."],
  Diligence: ["I put in consistent effort to finish things well.","I am reliable and follow through on small tasks."],
  Eloquence: ["I craft my message so it comes across clearly.","I use words that make complicated ideas easy to understand."],
  Empathy: ["I notice how others are feeling without them saying anything.","I pick up on people's emotions in a room."],
  Flexibility: ["When plans change, I adapt quickly.","I can change my approach when things go completely sideways."],
  Frankness: ["I say difficult things respectfully and directly.","I prefer to be clear rather than polite but vague."],
  Honesty: ["I would rather tell the truth and face the consequences.","When asked, I give the real answer, not the easy one."],
  Improvisation: ["I can figure things out as I go and still get good results.","I'm comfortable making things up on the spot."],
  Independence: ["I prefer minimal check-ins once I understand what to do.","I like figuring things out myself before asking for help."],
  Insightfulness: ["I notice patterns in people that others miss.","I can often figure out what motivates someone."],
  Integrity: ["I stand up for what's right even if it costs me.","I don't cut corners, even when no one is watching."],
  Kindness: ["I look for chances to help people without being asked.","I give feedback in a caring way."],
  Logic: ["I break things down and decide based on facts.","I want evidence before I commit to something."],
  Mastery: ["I practice until I can do something really well.","I study my craft beyond what my job requires."],
  Meticulousness: ["I notice small mistakes and fix them.","I check details carefully before finishing something."],
  "Open-mindedness": ["I like hearing ideas I disagree with.","I can change my mind when I get new evidence."],
  Organization: ["I keep my plans, files, and schedules neat.","I turn messy situations into clear steps."],
  Patience: ["I'm okay with delays if the final result is better.","I wait things out without getting upset."],
  Persuasiveness: ["I present ideas in a way that gets others on board.","I can change how people think with how I present things."],
  Compliance: ["I follow rules exactly as written.","I prefer clear rules and procedures."],
  Punctuality: ["I show up on time and expect others to do the same.","I plan in advance to make sure I'm never late."],
  Reliability: ["If I say I'll do something, I do it.","People count on me to deliver without reminders."],
  Resilience: ["It's easy for me to bounce back after facing a failure.","I recover quickly when plans fall through."],
  Resourcefulness: ["I find a way to get things done even with limited resources.","I create solutions that work with what I have."],
  "Self-Discipline": ["I make myself do boring but important work.","I stick to routines even when I don't feel motivated."],
  "Self-Reliance": ["I try to solve problems myself first.","I'm comfortable handling things on my own."],
  Sociability: ["I start conversations and keep them going.","I naturally bring people together."],
  Uniformity: ["I like processes done the same way every time.","I prefer repeatable steps over improvising."]
};

export const IKIGAI_SCENARIOS = [
  // Extraversion vs Introversion scenarios
  {
    text: "At a networking event, I would most likely:",
    options: [
      { text: "Start talking to lots of people I don't know", pole: "Extraversion" },
      { text: "Find one or two people to have deep conversations with", pole: "Introversion" },
      { text: "Watch and listen instead of starting conversations", pole: "Introversion" },
      { text: "Walk around and introduce people to each other", pole: "Extraversion" }
    ]
  },
  {
    text: "After a long work week, I recharge by:",
    options: [
      { text: "Going out with friends to social events", pole: "Extraversion" },
      { text: "Spending quiet time alone with a book or hobby", pole: "Introversion" },
      { text: "Having meaningful one-on-one conversations", pole: "Introversion" },
      { text: "Organizing group activities or parties", pole: "Extraversion" }
    ]
  },
  
  // Pragmatism vs Idealism scenarios
  {
    text: "When making an important decision, I prioritize:",
    options: [
      { text: "What will actually work given the current situation", pole: "Pragmatism" },
      { text: "What matches my core values and beliefs", pole: "Idealism" },
      { text: "The fastest way to reach my goal", pole: "Pragmatism" },
      { text: "The solution that does the most good long-term", pole: "Idealism" }
    ]
  },
  {
    text: "When faced with an imperfect solution:",
    options: [
      { text: "Take it if it solves most of the problem", pole: "Pragmatism" },
      { text: "Keep working toward the perfect solution", pole: "Idealism" },
      { text: "Use it and improve it based on feedback", pole: "Pragmatism" },
      { text: "Wait for something that fully matches my vision", pole: "Idealism" }
    ]
  },
  
  // Logic vs Empathy scenarios
  {
    text: "When someone makes a mistake at work:",
    options: [
      { text: "I focus on figuring out what went wrong and how to fix the process", pole: "Logic" },
      { text: "I think about how they might be feeling and offer support", pole: "Empathy" },
      { text: "I look at what systems or procedures failed", pole: "Logic" },
      { text: "I check how they're doing and boost their confidence", pole: "Empathy" }
    ]
  },
  {
    text: "In a team disagreement, I tend to:",
    options: [
      { text: "Use facts and logic to support my position", pole: "Logic" },
      { text: "Try to understand each person's point of view and feelings", pole: "Empathy" },
      { text: "Focus on finding the most reasonable solution", pole: "Logic" },
      { text: "Make sure everyone feels heard and valued", pole: "Empathy" }
    ]
  },
  
  // Strictness vs Relaxedness scenarios
  {
    text: "When planning a project:",
    options: [
      { text: "I create detailed timelines with specific deadlines", pole: "Strictness" },
      { text: "I set broad goals and adjust as I learn more", pole: "Relaxedness" },
      { text: "I set up clear rules and procedures for the team", pole: "Strictness" },
      { text: "I keep things flexible to allow for creativity and changes", pole: "Relaxedness" }
    ]
  },
  {
    text: "In my daily routine:",
    options: [
      { text: "I follow a structured schedule with set times for things", pole: "Strictness" },
      { text: "I go with the flow and see what each day brings", pole: "Relaxedness" },
      { text: "I have clear rules and boundaries for work-life balance", pole: "Strictness" },
      { text: "I adjust my schedule based on my energy and opportunities", pole: "Relaxedness" }
    ]
  },
  {
    text: "When learning something new:",
    options: [
      { text: "I research thoroughly and create a structured learning plan", pole: "Logic" },
      { text: "I jump in and learn by doing it", pole: "Pragmatism" },
      { text: "I find a mentor or teacher to guide me personally", pole: "Empathy" },
      { text: "I study the theory and principles behind it first", pole: "Idealism" }
    ]
  },
  {
    text: "When working on a creative project:",
    options: [
      { text: "I follow established creative processes and techniques", pole: "Strictness" },
      { text: "I try different things without worrying about rules", pole: "Relaxedness" },
      { text: "I work with others to build on different ideas", pole: "Extraversion" },
      { text: "I work alone to develop my unique vision", pole: "Introversion" }
    ]
  }
];

export const IKIGAI_AXES = [
  ["Extraversion", "Introversion"],
  ["Pragmatism", "Idealism"],
  ["Logic", "Empathy"],
  ["Strictness", "Relaxedness"]
];

export const IKIGAI_ROLE_RECOMMENDATIONS = {
  // Extraversion + Pragmatism combinations
  "Extraversion-Pragmatism": [
    "Sales Representative", "Business Development Manager", "Project Manager", "Marketing Manager"
  ],
  "Extraversion-Idealism": [
    "Team Lead", "Community Manager", "Training Coordinator", "Event Planner"
  ],
  "Introversion-Pragmatism": [
    "Software Engineer", "Data Analyst", "Research Scientist", "Technical Writer"
  ],
  "Introversion-Idealism": [
    "UX Designer", "Content Strategist", "Product Manager", "Research Analyst"
  ],
  // Logic combinations
  "Logic-Strictness": [
    "Quality Assurance Engineer", "Compliance Officer", "Operations Manager", "Financial Analyst"
  ],
  "Logic-Relaxedness": [
    "Software Architect", "Systems Engineer", "Consultant", "Technical Lead"
  ],
  // Empathy combinations
  "Empathy-Strictness": [
    "HR Manager", "Customer Success Manager", "Healthcare Administrator", "Social Worker"
  ],
  "Empathy-Relaxedness": [
    "Counselor", "Life Coach", "Customer Experience Manager", "Community Outreach Coordinator"
  ]
};

export function analyzeCompleteAssessment(
  traitScores: Record<string, number>,
  philosophyScores: Record<string, number>
) {
  const axes = IKIGAI_AXES;
  const axisResults: Record<string, any> = {};
  
  // Calculate dominant poles for each axis
  axes.forEach(([poleA, poleB]) => {
    const scoreA = philosophyScores[poleA] || 0;
    const scoreB = philosophyScores[poleB] || 0;
    const delta = scoreA - scoreB;
    const dominant = delta > 0 ? poleA : delta < 0 ? poleB : "Balanced";
    
    axisResults[`${poleA}-${poleB}`] = {
      scores: { [poleA]: scoreA, [poleB]: scoreB },
      delta,
      dominant
    };
  });
  
  // Rank all 40 traits
  const rankedTraits = Object.entries(traitScores)
    .sort((a, b) => b[1] - a[1])
    .map(([trait, score]) => ({ trait, score }));
  
  const top4Traits = rankedTraits.slice(0, 4).map(({ trait }) => trait);
  const top10Traits = rankedTraits.slice(0, 10).map(({ trait }) => trait);
  
  // Get top philosophy traits
  const philosophyRanking = Object.entries(philosophyScores)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([trait]) => trait);
  
  // Find role recommendations
  const roleKey = philosophyRanking.join('-') as keyof typeof IKIGAI_ROLE_RECOMMENDATIONS;
  const roleKeyReverse = `${philosophyRanking[1]}-${philosophyRanking[0]}` as keyof typeof IKIGAI_ROLE_RECOMMENDATIONS;
  const recommendedRoles = IKIGAI_ROLE_RECOMMENDATIONS[roleKey] || 
                          IKIGAI_ROLE_RECOMMENDATIONS[roleKeyReverse] ||
                          ["General Professional", "Consultant", "Specialist"];
  
  return {
    // Trait analysis
    rankedTraits,
    top4Traits,
    top10Traits,
    
    // Philosophy analysis
    axisResults,
    philosophyRanking,
    
    // Combined insights
    recommendedRoles,
    personalityType: `${philosophyRanking[0]} + ${philosophyRanking[1]}`,
    
    // Detailed scores
    traitScores,
    philosophyScores
  };
}

// Legacy function for backward compatibility
export function analyzeIkigaiResults(poleScores: Record<string, number>) {
  return analyzeCompleteAssessment({}, poleScores);
}
