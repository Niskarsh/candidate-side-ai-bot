// All static data lives here. Import this file; never stuff it into LLM prompts.

export type Trait =
  | "Accountability" | "Ambition" | "Approachableness" | "Assertiveness" | "Autonomy"
  | "Calmness" | "Collaboration" | "Competition" | "Concentration" | "Creativity"
  | "Curiosity" | "Delegation" | "Determination" | "Diligence" | "Eloquence"
  | "Empathy" | "Flexibility" | "Frankness" | "Honesty" | "Improvisation"
  | "Independence" | "Insightfulness" | "Integrity" | "Kindness" | "Logic"
  | "Mastery" | "Meticulousness" | "Open-mindedness" | "Organization" | "Patience"
  | "Persuasiveness" | "Compliance" | "Punctuality" | "Reliability" | "Resilience"
  | "Resourcefulness" | "Self-Discipline" | "Self-Reliance" | "Sociability" | "Uniformity";

export const TRAITS: Trait[] = [
  "Accountability","Ambition","Approachableness","Assertiveness","Autonomy","Calmness","Collaboration",
  "Competition","Concentration","Creativity","Curiosity","Delegation","Determination","Diligence","Eloquence",
  "Empathy","Flexibility","Frankness","Honesty","Improvisation","Independence","Insightfulness","Integrity",
  "Kindness","Logic","Mastery","Meticulousness","Open-mindedness","Organization","Patience","Persuasiveness",
  "Compliance","Punctuality","Reliability","Resilience","Resourcefulness","Self-Discipline","Self-Reliance",
  "Sociability","Uniformity"
];

export const TRAIT_BEHAVIORS: Record<Trait, [string, string]> = {
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

export type Axis = "Extraversion" | "Introversion" | "Pragmatism" | "Idealism" | "Logic" | "Empathy" | "Strictness" | "Relaxedness";

export const AXES: [Axis, Axis][] = [
  ["Extraversion","Introversion"],
  ["Pragmatism","Idealism"],
  ["Logic","Empathy"],
  ["Strictness","Relaxedness"]
];

export type Scenario = {
  text: string;
  options: Array<{ text: string; pole: Axis }>; // 4 options
};

export const PHIL_SCENARIOS: Scenario[] = [
  { text: "At a networking event, I would most likely:",
    options: [
      { text: "Start talking to lots of people I don't know", pole: "Extraversion" },
      { text: "Find one or two people to have deep conversations with", pole: "Introversion" },
      { text: "Watch and listen instead of starting conversations", pole: "Introversion" },
      { text: "Walk around and introduce people to each other", pole: "Extraversion" }
    ]
  },
  { text: "After a long work week, I recharge by:",
    options: [
      { text: "Going out with friends to social events", pole: "Extraversion" },
      { text: "Spending quiet time alone with a book or hobby", pole: "Introversion" },
      { text: "Having meaningful one-on-one conversations", pole: "Introversion" },
      { text: "Organizing group activities or parties", pole: "Extraversion" }
    ]
  },
  // ... include the rest of your 25 scenarios exactly as defined in your app
];

// Helpers (pure, no LLM)
export function behaviorForTrait(trait: Trait, preferIdx: 0 | 1): string {
  return TRAIT_BEHAVIORS[trait][preferIdx];
}
