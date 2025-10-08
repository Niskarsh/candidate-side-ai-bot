import { TRAITS, TRAIT_BEHAVIORS, PHIL_SCENARIOS, AXES, type Trait, type Axis, type Scenario } from "./ikigai_static";

// ---------- Types ----------
export type Stage = "A" | "B" | "C";

export type IkigaiState = {
  token: string;                // opaque id
  stage: Stage;                 // "A" | "B" | "C"
  block: number;                // 1-based within stage
  progress: string;             // "A:x/12,B:y/10,C:z/10"
  // scores
  aScores: Record<Trait, number>;
  bScores: Record<Trait, number>;
  poleScores: Record<Axis, number>;
  // flow control
  top10: Trait[];               // decided after A
  usedBehaviorsA: Record<Trait, Set<string>>;
  usedBehaviorsB: Record<Trait, Set<string>>;
  usedScenarioIdx: Set<number>;
  rngSeed: number;              // numeric seed for deterministic RNG
};

export type QuestionTurn =
  | { // Stages A/B
      question: { text: string; options: string[] };
      state: { token: string; progress: string; stage: Stage; block: number };
      isLastQuestion: boolean;
      _meta?: { traits?: Trait[] } // internal mapping (optional to keep; don’t show to user)
    }
  | { // Stage C
      question: { text: string; options: string[] };
      state: { token: string; progress: string; stage: Stage; block: number };
      isLastQuestion: boolean;
      _meta?: { scenarioIndex?: number; poles?: Axis[] }
    };

export type UserReply = { most: 1|2|3|4; least: 1|2|3|4 };

export type FinalResults = {
  stages: {
    A: { scores: Record<Trait, number>; top10: Trait[] };
    B: { combinedScores: Record<Trait, number>; rankedAll: Trait[]; top4: Trait[] };
    C: {
      axes: Array<{
        axis: string;
        scores: Record<Axis, number>;
        delta: number;
        dominant: Axis | "Balanced";
      }>;
      cumulativeRanking: Array<{ pole: Axis; score: number }>;
    }
  },
  summary: {
    ikigaiTraits: Trait[];
    dominantPhilosophy: [Axis, Axis, Axis, Axis] | [string, string, string, string];
  }
};

// ---------- Deterministic RNG ----------
class RNG {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  next(): number {
    // xorshift32
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return (this.s % 1_000_000) / 1_000_000;
  }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}

function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- State init / progress ----------
export function initState(token = cryptoToken()): IkigaiState {
  const zero = TRAITS.reduce((m,t) => (m[t]=0,m), {} as Record<Trait,number>);
  return {
    token,
    stage: "A",
    block: 1,
    progress: "A:0/12,B:0/10,C:0/10",
    aScores: { ...zero },
    bScores: { ...zero },
    poleScores: { Extraversion:0, Introversion:0, Pragmatism:0, Idealism:0, Logic:0, Empathy:0, Strictness:0, Relaxedness:0 },
    top10: [],
    usedBehaviorsA: Object.fromEntries(TRAITS.map(t=>[t,new Set<string>()])) as Record<Trait,Set<string>>,
    usedBehaviorsB: Object.fromEntries(TRAITS.map(t=>[t,new Set<string>()])) as Record<Trait,Set<string>>,
    usedScenarioIdx: new Set<number>(),
    rngSeed: strHash(token)
  };
}

function cryptoToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function updateProgress(s: IkigaiState): void {
  const a = s.stage === "A" ? s.block-1 : 12;
  const b = s.stage === "B" ? s.block-1 : (s.top10.length ? 10 : 0);
  const c = s.stage === "C" ? s.block-1 : 0;
  s.progress = `A:${a}/12,B:${b}/10,C:${c}/10`;
}

// ---------- Question generation ----------
export function generateQuestion(state: IkigaiState): QuestionTurn {
  const rng = new RNG(state.rngSeed + state.block * 97 + (state.stage.charCodeAt(0) << 3));
  updateProgress(state);

  if (state.stage === "A" || state.stage === "B") {
    const pool = state.stage === "A" ? TRAITS : state.top10;
    if (!pool.length) throw new Error("Top10 not computed before Stage B");

    const traits = rng.shuffle(pool).slice(0, 4) as Trait[];

    const options = traits.map((t) => {
      const [s1, s2] = TRAIT_BEHAVIORS[t];
      const used = state.stage === "A" ? state.usedBehaviorsA[t] : state.usedBehaviorsB[t];
      // prefer the statement not used yet in this stage
      const first = !used.has(s1) ? s1 : !used.has(s2) ? s2 : rng.pick([s1, s2]);
      used.add(first);
      return first;
    });

    return {
      question: { text: "Choose MOST and LEAST like you", options },
      state: { token: state.token, progress: state.progress, stage: state.stage, block: state.block },
      isLastQuestion: state.stage === "C" && state.block === 10 ? true : false,
      _meta: { traits }
    };
  }

  // Stage C
  // pick an unused scenario deterministically
  const order = rng.shuffle([...Array(PHIL_SCENARIOS.length).keys()]);
  const idx = order.find(i => !state.usedScenarioIdx.has(i)) ?? 0;
  state.usedScenarioIdx.add(idx);
  const sc = PHIL_SCENARIOS[idx];

  const options = sc.options.map(o => o.text);
  return {
    question: { text: sc.text, options },
    state: { token: state.token, progress: state.progress, stage: state.stage, block: state.block },
    isLastQuestion: state.stage === "C" && state.block === 10,
    _meta: { scenarioIndex: idx, poles: sc.options.map(o=>o.pole) as Axis[] }
  };
}

// ---------- Apply reply & advance ----------
export function applyReply(state: IkigaiState, reply: UserReply, meta: QuestionTurn["_meta"]): void {
  const { most, least } = reply;
  if (most === least) throw new Error("most and least cannot be the same");

  if (state.stage === "A" || state.stage === "B") {
    const mTraits = (meta as any).traits as Trait[];
    const mostTrait = mTraits[most-1];
    const leastTrait = mTraits[least-1];
    const w = state.stage === "A" ? 1 : 1.5;

    state.aScores[mostTrait] += (state.stage === "A" ? +1 : 0);
    state.aScores[leastTrait] += (state.stage === "A" ? -1 : 0);

    state.bScores[mostTrait] += (state.stage === "B" ? +w : 0);
    state.bScores[leastTrait] += (state.stage === "B" ? -w : 0);
  } else {
    const poles = (meta as any).poles as Axis[];
    const mostPole = poles[most-1];
    const leastPole = poles[least-1];
    state.poleScores[mostPole] = (state.poleScores[mostPole] ?? 0) + 1;
    state.poleScores[leastPole] = (state.poleScores[leastPole] ?? 0) - 1;
  }

  // advance
  if (state.stage === "A") {
    if (state.block < 12) {
      state.block++;
    } else {
      // compute Top10
      const ranked = Object.entries(state.aScores)
        .sort((a,b) => (b[1]-a[1]) || a[0].localeCompare(b[0])) as [Trait, number][];
      state.top10 = ranked.slice(0,10).map(([t])=>t);
      state.stage = "B";
      state.block = 1;
    }
  } else if (state.stage === "B") {
    if (state.block < 10) {
      state.block++;
    } else {
      state.stage = "C";
      state.block = 1;
    }
  } else { // C
    if (state.block < 10) {
      state.block++;
    } else {
      // done; keep at C:10
    }
  }
}

// ---------- Final output ----------
export function isFinished(state: IkigaiState): boolean {
  return state.stage === "C" && state.block === 10 && state.usedScenarioIdx.size >= 10;
}

export function getFinal(state: IkigaiState): FinalResults {
  // combined scores
  const combined: Record<Trait, number> = {} as any;
  for (const t of TRAITS) combined[t] = state.aScores[t] + state.bScores[t];

  const rankedAll = Object.entries(combined)
    .sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0])) as [Trait, number][];
  const top4 = rankedAll.slice(0,4).map(([t])=>t);

  // axes
  const axesOut = AXES.map(([A,B])=>{
    const a = state.poleScores[A] || 0;
    const b = state.poleScores[B] || 0;
    const delta = a - b;
    const dominant: Axis | "Balanced" = delta > 0 ? A : delta < 0 ? B : "Balanced";
    return {
      axis: `${A} vs ${B}`,
      scores: { [A]: a, [B]: b } as Record<Axis, number>,
      delta,
      dominant
    };
  });

  const cumulativeRanking = Object.entries(state.poleScores)
    .sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0])) as [Axis, number][];

  return {
    stages: {
      A: { scores: state.aScores, top10: state.top10 },
      B: { combinedScores: combined, rankedAll: rankedAll.map(([t])=>t), top4 },
      C: {
        axes: axesOut,
        cumulativeRanking: cumulativeRanking.map(([pole, score])=>({ pole, score }))
      }
    },
    summary: {
      ikigaiTraits: top4,
      dominantPhilosophy: AXES.map(([A,B])=>{
        const a = state.poleScores[A] || 0; const b = state.poleScores[B] || 0;
        return a===b ? ("Balanced" as any) : (a>b?A:B);
      }) as any
    }
  };
}
