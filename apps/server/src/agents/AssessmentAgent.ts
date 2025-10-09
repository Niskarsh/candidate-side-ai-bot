// AssessmentAgent.ts
// Conversational assessment agent with LLM evidence extraction
// Integrates with existing Agent interface

import { Agent, AgentRunResult } from "./Agent.js";
import { geminiExtractJSON } from "../services/gemini.js";

/////////////////////////////
// Types
/////////////////////////////

export type Trait =
  | "Accountability" | "Reliability" | "Ownership" | "Leadership" | "Bias to Action"
  | "Concentration"  | "Detail Orientation" | "Organization" | "Punctuality" | "Systems Thinking"
  | "Creativity"     | "Curiosity"   | "Insightfulness" | "Learning Agility" | "Mastery"
  | "Empathy"        | "Collaboration"| "Coachability" | "Eloquence" | "Storytelling"
  | "Negotiation"    | "Pragmatism"  | "Integrity"  | "Resilience" | "Risk-Taking"
  | "Logic"          | "Independence"| "Improvisation" | "Kindness"  | "Vision";

export type AxisName =
  | "Extraversion–Introversion"
  | "Pragmatism–Idealism"
  | "Logic–Empathy"
  | "Structure–Flexibility"
  | "Speed–Deliberation"
  | "Individual–Collective"
  | "Short-Term–Long-Term"
  | "Certainty–Exploration";

type TraitScore = { mu: number; n: number };
type AxisCounts = { left: number; right: number };

export type SessionState = {
  sessionId: string;
  traits: Record<Trait, TraitScore>;
  axes: Record<AxisName, AxisCounts>;
  turns: number;
  askedIds: Set<string>;
  history: Array<{ qId: string; question: string; answer: string }>;
  lastTop8?: Trait[];
  lastBottom8?: Trait[];
};

type OpenQuestion = {
  id: string;
  text: string;
  hints?: { traits?: Trait[]; axes?: AxisName[] };
};

type ExtractedJSON = {
  trait_evidence: Array<{ trait: Trait; direction: "up"|"down"; strength: 1|2; justification: string }>;
  axis_evidence: Array<{ axis: AxisName; pole: string; strength: 1|2; justification: string }>;
};

/////////////////////////////
// Constants
/////////////////////////////

const TRAITS: Trait[] = [
  "Accountability","Reliability","Ownership","Leadership","Bias to Action",
  "Concentration","Detail Orientation","Organization","Punctuality","Systems Thinking",
  "Creativity","Curiosity","Insightfulness","Learning Agility","Mastery",
  "Empathy","Collaboration","Coachability","Eloquence","Storytelling",
  "Negotiation","Pragmatism","Integrity","Resilience","Risk-Taking",
  "Logic","Independence","Improvisation","Kindness","Vision"
];

const AXES: AxisName[] = [
  "Extraversion–Introversion",
  "Pragmatism–Idealism",
  "Logic–Empathy",
  "Structure–Flexibility",
  "Speed–Deliberation",
  "Individual–Collective",
  "Short-Term–Long-Term",
  "Certainty–Exploration"
];

const START_ELO = 1500;
const ELO_K = 22;
const AXIS_PRIOR = 1.5;
const MAX_TURNS = 10;
const GAP_STOP = 55;
const UNCERTAINTY_FOCUS_COUNT = 8;

const QUESTIONS: OpenQuestion[] = [
  {
    id: "proj:hardest_ship",
    text: "Tell me about the hardest project you shipped end-to-end. What made it hard, and how did you push it over the line?",
    hints: { traits: ["Ownership","Resilience","Pragmatism","Leadership","Bias to Action","Organization"], axes: ["Speed–Deliberation","Structure–Flexibility","Short-Term–Long-Term"] }
  },
  {
    id: "conflict:team",
    text: "Describe a disagreement with a teammate or stakeholder. What was the disagreement about, and how did you resolve it?",
    hints: { traits: ["Empathy","Negotiation","Eloquence","Integrity","Collaboration"], axes: ["Logic–Empathy","Individual–Collective"] }
  },
  {
    id: "quality:bar",
    text: "When quality and timelines clash, what do you usually optimize for, and how do you decide?",
    hints: { traits: ["Pragmatism","Integrity","Detail Orientation","Mastery"], axes: ["Pragmatism–Idealism","Speed–Deliberation"] }
  },
  {
    id: "learning:pivot",
    text: "Share a time you changed your mind based on new data or user feedback. What changed and why?",
    hints: { traits: ["Learning Agility","Curiosity","Logic","Coachability","Insightfulness"], axes: ["Certainty–Exploration","Logic–Empathy"] }
  },
  {
    id: "risk:decision",
    text: "Tell me about a calculated risk you took. What was your reasoning, and what happened?",
    hints: { traits: ["Risk-Taking","Logic","Vision","Ownership"], axes: ["Certainty–Exploration","Short-Term–Long-Term"] }
  },
  {
    id: "structure:day",
    text: "What does a highly productive day look like for you? How do you structure it?",
    hints: { traits: ["Organization","Punctuality","Concentration","Systems Thinking"], axes: ["Structure–Flexibility","Short-Term–Long-Term"] }
  },
  {
    id: "collab:style",
    text: "How do you like to collaborate? What energizes you in group settings vs solo work?",
    hints: { traits: ["Collaboration","Empathy","Independence","Eloquence"], axes: ["Extraversion–Introversion","Individual–Collective"] }
  },
  {
    id: "story:influence",
    text: "Share an example where your communication or narrative changed a decision.",
    hints: { traits: ["Storytelling","Eloquence","Negotiation","Leadership"], axes: ["Logic–Empathy","Individual–Collective"] }
  },
  {
    id: "failure:recovery",
    text: "Describe a failure or near-miss. How did you respond, and what did you change next time?",
    hints: { traits: ["Resilience","Accountability","Learning Agility","Integrity"], axes: ["Short-Term–Long-Term","Certainty–Exploration"] }
  },
  {
    id: "vision:roadmap",
    text: "If you had full autonomy for 6 months, what would you build and how would you sequence it?",
    hints: { traits: ["Vision","Ownership","Systems Thinking","Creativity","Pragmatism"], axes: ["Short-Term–Long-Term","Structure–Flexibility"] }
  }
];

/////////////////////////////
// AssessmentAgent (Agent interface wrapper)
/////////////////////////////

export class AssessmentAgent implements Agent {
  name = "IkigaiAgent";
  description = "Conducts conversational Ikigai assessment by asking open-ended questions and extracting trait/axis evidence from answers. Identifies top 8 and bottom 8 traits through adaptive questioning.";
  systemPrompt = "You are a warm assessment coach asking insightful questions about work style and values.";

  private sessions = new Map<string, SessionState>();

  async run({ userMessage, priorProfile, history }: {
    userMessage: string;
    priorProfile?: any;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<AgentRunResult> {

    const sessionId = priorProfile?.assessmentSessionId || this.generateSessionId();
    let state = this.sessions.get(sessionId);

    // Boot session if first time
    if (!state) {
      state = this.initState(sessionId, priorProfile);
      this.sessions.set(sessionId, state);
      
      const nextQ = this.pickNextQuestion(state);
      state.askedIds.add(nextQ.id);
      state.turns++;
      
      return {
        messages: [
          this.warmOpen(state),
          "",
          nextQ.text
        ],
        updatedProfile: {
          ...priorProfile,
          assessmentSessionId: sessionId,
          assessmentState: this.serializeState(state),
          currentQuestionId: nextQ.id
        },
        takeBackControl: false
      };
    }

    // Process answer from previous question
    const lastQuestionId = priorProfile?.currentQuestionId;
    if (lastQuestionId && userMessage.trim().length > 10) {
      const lastQ = QUESTIONS.find(q => q.id === lastQuestionId);
      if (lastQ) {
        state.history.push({ qId: lastQ.id, question: lastQ.text, answer: userMessage });
        
        // Extract evidence using LLM
        try {
          const extracted = await this.extractEvidence(lastQ.text, userMessage);
          this.applyExtraction(state, extracted);
        } catch (e) {
          console.error("Evidence extraction failed:", e);
        }
      }
    }

    // Check if we should stop
    if (this.shouldStop(state)) {
      return this.generateFinalAnalysis(state, priorProfile);
    }

    // Ask next question
    const nextQ = this.pickNextQuestion(state);
    state.askedIds.add(nextQ.id);
    state.turns++;

    return {
      messages: [
        this.miniSummary(state),
        "",
        nextQ.text
      ],
      updatedProfile: {
        ...priorProfile,
        assessmentSessionId: sessionId,
        assessmentState: this.serializeState(state),
        currentQuestionId: nextQ.id
      },
      takeBackControl: false
    };
  }

  private generateSessionId(): string {
    return `assess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private initState(sessionId: string, priorProfile: any): SessionState {
    const traits = {} as Record<Trait, TraitScore>;
    for (const t of TRAITS) traits[t] = { mu: START_ELO, n: 0 };

    const axes = {} as Record<AxisName, AxisCounts>;
    for (const a of AXES) axes[a] = { left: AXIS_PRIOR, right: AXIS_PRIOR };

    const st: SessionState = {
      sessionId,
      traits,
      axes,
      turns: 0,
      askedIds: new Set(),
      history: []
    };

    this.applyLinkedInPriors(st, priorProfile?.linkedinData || priorProfile);
    return st;
  }

  private applyLinkedInPriors(st: SessionState, linkedIn: any) {
    if (!linkedIn) return;

    const bump = (t: Trait, delta: number) => { 
      if (st.traits[t]) {
        st.traits[t].mu += delta; 
        st.traits[t].n += 1; 
      }
    };

    const positions = linkedIn.positions || linkedIn.experiences || [];
    const titles = positions.map((p: any) => (p.title || '').toLowerCase());
    const totalMonths = positions.reduce((a: number, p: any) => {
      const start = p.start || p.date_range?.split('-')[0];
      const end = p.end || (p.date_range?.includes('Present') ? null : p.date_range?.split('-')[1]);
      return a + this.monthsBetween(start, end);
    }, 0);

    if (totalMonths >= 60) { bump("Reliability", 45); bump("Punctuality", 35); bump("Organization", 35); }
    if (titles.some((t: string) => /manager|lead|head|director|vp|cto|ceo|founder/.test(t))) { bump("Leadership", 50); bump("Ownership", 40); bump("Accountability", 40); }
    if (titles.some((t: string) => /designer|ux|ui|product/.test(t))) { bump("Creativity", 35); bump("Insightfulness", 30); bump("Empathy", 25); }
    if (titles.some((t: string) => /research|analyst|data|ml|scientist|quant/.test(t))) { bump("Concentration", 35); bump("Detail Orientation", 30); bump("Logic", 35); }
    if (titles.some((t: string) => /sales|marketing|growth|bd|partnership/.test(t))) { bump("Eloquence", 35); bump("Negotiation", 30); bump("Storytelling", 30); }
    
    const education = linkedIn.education || linkedIn.educations || [];
    if (education.length >= 2) { bump("Learning Agility", 25); bump("Mastery", 20); }
  }

  private monthsBetween(start?: string, end?: string | null): number {
    if (!start) return 0;
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
  }

  private warmOpen(st: SessionState): string {
    const guess = Object.entries(st.traits)
      .sort((a, b) => b[1].mu - a[1].mu)
      .slice(0, 2)
      .map(([t]) => t)
      .join(" & ");
    return `From your background, I'm sensing strengths like **${guess}**. I'll ask a few short questions about your work to refine your profile.`;
  }

  private miniSummary(st: SessionState): string {
    const top4 = Object.entries(st.traits)
      .sort((a, b) => b[1].mu - a[1].mu)
      .slice(0, 4)
      .map(([t]) => t)
      .join(", ");
    return `📊 Signal so far: **${top4}**. Focusing next on areas where I'm least certain.`;
  }

  private pickNextQuestion(st: SessionState): OpenQuestion {
    const ranked = this.rankTraits(st.traits);
    const midStart = Math.floor((ranked.length - UNCERTAINTY_FOCUS_COUNT) / 2);
    const focusSet = new Set(ranked.slice(midStart, midStart + UNCERTAINTY_FOCUS_COUNT));

    let best: { q: OpenQuestion; score: number } | null = null;
    for (const q of QUESTIONS) {
      if (st.askedIds.has(q.id)) continue;
      let score = 0;
      for (const t of (q.hints?.traits ?? [])) if (focusSet.has(t)) score += 2;
      for (const ax of (q.hints?.axes ?? [])) {
        const c = st.axes[ax];
        const delta = Math.abs(c.left - c.right);
        if (delta < 1.8) score += 1.5;
      }
      if (!best || score > best.score) best = { q, score };
    }

    return best?.q || QUESTIONS.find(q => !st.askedIds.has(q.id)) || QUESTIONS[0];
  }

  private async extractEvidence(question: string, answer: string): Promise<ExtractedJSON> {
    const userPrompt = this.buildExtractorPrompt(question, answer);
    return await geminiExtractJSON(userPrompt);
  }

  private buildExtractorPrompt(question: string, answer: string): string {
    const traitList = TRAITS.join(", ");
    const axisList = AXES.join(" | ");
    return `
Question: ${question}
Answer: ${answer}

Identify ONLY signals present in the answer (no guesswork).
- Traits universe: ${traitList}
- Axes universe (LEFT–RIGHT): ${axisList}

Return JSON with:
- trait_evidence: traits clearly supported or contradicted
- axis_evidence: choose LEFT or RIGHT word exactly from axis label for 'pole'
- strength: 2 for very explicit; 1 for weak/implicit

Examples:
- "shipped fast with scope cuts" → "Bias to Action" (up,2), "Pragmatism" (up,2), Speed (LEFT) on Speed–Deliberation
- "perfecting quality even if it slips" → "Mastery" (up,2), "Detail Orientation" (up,2), Deliberation (RIGHT) on Speed–Deliberation

Return ONLY JSON.
    `.trim();
  }

  private applyExtraction(st: SessionState, ex: ExtractedJSON) {
    for (const e of ex.trait_evidence ?? []) {
      if (!st.traits[e.trait]) continue;
      const step = (e.direction === "up" ? +1 : -1) * (e.strength === 2 ? ELO_K : Math.round(ELO_K * 0.6));
      st.traits[e.trait].mu += step;
      st.traits[e.trait].n += 1;
    }

    for (const a of ex.axis_evidence ?? []) {
      const axis = AXES.find(ax => ax === a.axis);
      if (!axis) continue;
      const [leftName, rightName] = axis.split("–");
      const pole = a.pole === leftName ? "left" : a.pole === rightName ? "right" : null;
      if (!pole) continue;
      st.axes[axis][pole] += (a.strength === 2 ? 1.0 : 0.6);
    }
  }

  private rankTraits(traits: Record<Trait, TraitScore>): Trait[] {
    return Object.entries(traits)
      .sort((a, b) => b[1].mu - a[1].mu)
      .map(([t]) => t as Trait);
  }

  private topBottom8(traits: Record<Trait, TraitScore>) {
    const ranked = this.rankTraits(traits);
    return { top8: ranked.slice(0, 8), bottom8: ranked.slice(-8).reverse() };
  }

  private shouldStop(st: SessionState): boolean {
    if (st.turns >= MAX_TURNS) return true;

    const ranked = this.rankTraits(st.traits);
    if (ranked.length < 10) return false;
    
    const gapTop = st.traits[ranked[7]].mu - st.traits[ranked[8]].mu;
    const gapBottom = st.traits[ranked[ranked.length - 9]].mu - st.traits[ranked[ranked.length - 8]].mu;
    const { top8, bottom8 } = this.topBottom8(st.traits);

    const stableTop = st.lastTop8 && this.arraysEqual(st.lastTop8, top8);
    const stableBottom = st.lastBottom8 && this.arraysEqual(st.lastBottom8, bottom8);

    st.lastTop8 = top8;
    st.lastBottom8 = bottom8;

    return gapTop >= GAP_STOP && Math.abs(gapBottom) >= GAP_STOP && stableTop && stableBottom;
  }

  private arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  private serializeState(st: SessionState): any {
    return {
      sessionId: st.sessionId,
      turns: st.turns,
      askedIds: Array.from(st.askedIds),
      top8: st.lastTop8,
      bottom8: st.lastBottom8
    };
  }

  private generateFinalAnalysis(state: SessionState, priorProfile: any): AgentRunResult {
    const { top8, bottom8 } = this.topBottom8(state.traits);
    const axes = AXES.map(a => {
      const v = state.axes[a];
      const delta = v.left - v.right;
      const [leftName, rightName] = a.split("–");
      const dominant = delta === 0 ? "Balanced" : delta > 0 ? leftName : rightName;
      return {
        axis: a,
        left: v.left,
        right: v.right,
        delta,
        dominant
      };
    });

    // Generate comprehensive insights
    const personaTitle = this.generatePersonaTitle(top8, axes);
    const ikigaiLine = `You thrive when leveraging ${top8.slice(0,3).join(', ').toLowerCase()} in environments that value ${axes[0].dominant.toLowerCase()} and meaningful progress.`;
    const antiIkigai = `Avoid roles that require constant ${bottom8[0].toLowerCase()} or ${bottom8[1].toLowerCase()} - these drain your energy.`;
    const coreDrives = top8.slice(0, 3);
    const philosophyType = axes.filter(a => a.dominant !== "Balanced").slice(0, 2).map(a => a.dominant).join(" + ");
    const idealEnvironment = `Teams that value ${top8.slice(0,2).join(' and ').toLowerCase()}, with minimal ${bottom8.slice(0,2).join(' or ').toLowerCase()}.`;
    const watchOuts = `Over-indexing on ${top8[0].toLowerCase()}, under-developing ${bottom8[0].toLowerCase()}`;

    return {
      messages: [
        "🎯 **Your Complete Ikigai Profile**",
        "",
        `**Persona:** ${personaTitle}`,
        "",
        `**Your Ikigai:** ${ikigaiLine}`,
        "",
        `**Anti-Ikigai (What to Avoid):** ${antiIkigai}`,
        "",
        `**Core Drives:** ${coreDrives.join(', ')}`,
        "",
        `**Philosophy Type:** ${philosophyType}`,
        "",
        `**Ideal Environment:** ${idealEnvironment}`,
        "",
        `**Potential Watch-outs:** ${watchOuts}`,
        "",
        "**✨ Top 8 Traits (What You ARE):**",
        ...top8.map((t, i) => `${i+1}. **${t}** (Score: ${Math.round(state.traits[t].mu)})`),
        "",
        "**🚫 Bottom 8 Traits (What You are NOT):**",
        ...bottom8.map((t, i) => `${i+1}. **${t}** (Score: ${Math.round(state.traits[t].mu)})`),
        "",
        "**🧭 Philosophy Axes:**",
        ...axes.map(a => `• ${a.axis}: **${a.dominant}** (${a.left.toFixed(1)} vs ${a.right.toFixed(1)})`),
        "",
        "💡 **Tip:** Pair with teammates strong in your Bottom-8 traits for balance."
      ],
      updatedProfile: {
        ...priorProfile,
        personaTitle,
        ikigaiLine,
        antiIkigai,
        coreDrives,
        philosophyType,
        idealEnvironment,
        watchOuts,
        top8Traits: top8,
        bottom8Traits: bottom8,
        philosophyAxes: axes,
        traitScores: Object.fromEntries(
          Object.entries(state.traits).map(([t, r]) => [t, Math.round(r.mu)])
        )
      },
      takeBackControl: true
    };
  }

  private generatePersonaTitle(top8: Trait[], axes: any[]): string {
    const dominantAxis = axes.find(a => Math.abs(a.left - a.right) > 1.5);
    const dominant = dominantAxis?.dominant || top8[0];

    const personaTitles: Record<string, string> = {
      "Logic": "The Analytical Architect",
      "Empathy": "The People Champion",
      "Pragmatism": "The Pragmatic Executor",
      "Idealism": "The Visionary Builder",
      "Leadership": "The Strategic Leader",
      "Ownership": "The Accountable Owner",
      "Creativity": "The Creative Innovator",
      "Mastery": "The Technical Expert"
    };

    return personaTitles[dominant] || personaTitles[top8[0]] || "The Adaptive Professional";
  }

  private async extractEvidence(question: string, answer: string): Promise<ExtractedJSON> {
    const prompt = this.buildExtractorPrompt(question, answer);
    return await geminiExtractJSON(prompt);
  }

  private serializeState(st: SessionState): any {
    return {
      sessionId: st.sessionId,
      turns: st.turns,
      askedIds: Array.from(st.askedIds),
      top8: st.lastTop8,
      bottom8: st.lastBottom8
    };
  }
}

