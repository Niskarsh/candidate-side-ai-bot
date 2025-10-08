// IkigaiAgent.ts — drop-in

import path from "path";
import { fileURLToPath } from "node:url";
import { Agent } from "../BaseAgent/Agent";
import { name, description, systemPrompt } from "./AgentDetails";
import { geminiGenAI } from "../../services/gemini";
import {
  initState as initIkigaiState,
  generateQuestion as genIkigaiQuestion,
  applyReply as applyIkigaiReply,
  isFinished as ikigaiIsFinished,
  getFinal as getIkigaiFinal,
  type UserReply as IkigaiUserReply,
  type IkigaiState
} from "./utils/ikigai_engine";

type Stage = "A" | "B" | "C";

type IkigaiTurn = {
  question: { text: string; options: string[] };
  state: { token: string; progress: string; stage: Stage; block: number };
};

// The engine returns a turn with a hidden _meta we must keep for scoring.
// In A/B it's traits[], in C it's poles[]/scenarioIndex.
type QuestionMeta =
  | { traits?: string[] }
  | { scenarioIndex?: number; poles?: string[] };

// Strict schema for coercing free text -> { most, least }
const MostLeastSchema = {
  type: "object",
  properties: {
    most: { type: "integer", minimum: 1, maximum: 4 },
    least: { type: "integer", minimum: 1, maximum: 4 }
  },
  required: ["most", "least"],
  additionalProperties: false
};

export class Ikigai extends Agent {
  private engine: IkigaiState;
  private lastTurn: IkigaiTurn | null = null;
  private lastMeta: QuestionMeta | null = null;

  ikigai: {
    questions: { question: string; options: string[]; answer?: string; order?: number }[];
    progress: { token: string; progress: string; stage: string; block: number };
  };

  constructor(
    toolsAvailable?: Array<{ name: string; description: string }>,
    schemasAvailable?: Array<any>
  ) {
    // @ts-expect-error The 'import.meta' meta-property is only allowed
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const toolsDir = path.resolve(__dirname, "tools");

    super(name, description, systemPrompt, [], "", toolsDir);

    this.engine = initIkigaiState();

    this.ikigai = {
      questions: [],
      progress: {
        token: this.engine.token,
        progress: this.engine.progress,
        stage: this.engine.stage,
        block: this.engine.block
      }
    };

    if (this.WELCOME_MESSAGE) {
      this.history.push({ role: "model", content: this.WELCOME_MESSAGE });
    }
  }

  // ---------- Public reset (optional) ----------
  reset(token?: string) {
    this.engine = initIkigaiState(token);
    this.lastTurn = null;
    this.lastMeta = null;
    this.ikigai = {
      questions: [],
      progress: {
        token: this.engine.token,
        progress: this.engine.progress,
        stage: this.engine.stage,
        block: this.engine.block
      }
    };
  }

  // ---------- Markdown rendering ----------
  private renderTurnMarkdown(turn: IkigaiTurn): string {
    return this.toIkigaiMarkdown(turn, { showToken: false });
  }

  toIkigaiMarkdown(turn: IkigaiTurn, opts?: { showToken?: boolean }): string {
    const { question, state } = turn;
    const showToken = opts?.showToken ?? false;

    const escapeMd = (s: string) => s.replace(/([\\`*_{}[\]()#+\-.!])/g, "\\$1");

    const header = `### Stage ${state.stage} — Block ${state.block}`;
    const meta = `**Progress:** ${escapeMd(state.progress)}${
      showToken ? `  \n**Token:** \`${escapeMd(state.token)}\`` : ""
    }`;
    const q = `**${escapeMd(question.text)}**`;
    const list = question.options.map((opt, i) => `${i + 1}. ${escapeMd(opt)}`).join("\n");
    const hint = `\n\nReply any way you like (e.g., "1 most, 3 least", "A and C", or quote option text).`;

    return `${header}\n\n${meta}\n\n${q}\n\n${list}${hint}`;
  }

  // ---------- Coercion: free text -> { most, least } ----------
  private tryParseJsonReply(msg: string): IkigaiUserReply | null {
    try {
      const v = JSON.parse(msg);
      if (
        v &&
        typeof v === "object" &&
        Number.isInteger(v.most) &&
        v.most >= 1 &&
        v.most <= 4 &&
        Number.isInteger(v.least) &&
        v.least >= 1 &&
        v.least <= 4 &&
        v.most !== v.least
      ) {
        return { most: v.most, least: v.least };
      }
    } catch {}
    return null;
  }

  private async coerceMostLeastWithAI(
    userText: string,
    currentTurn: IkigaiTurn
  ): Promise<IkigaiUserReply | null> {
    const content = [
      {
        role: "user" as const,
        parts: [
          {
            text:
              `You are a strict parser. Extract the user's choices as indices 1-4 for Most and Least.\n` +
              `Return ONLY JSON matching the schema: { "most": 1-4, "least": 1-4 }.\n` +
              `If the user references letters (A-D) or words like "first/second/third/fourth" or "first and third", map to 1-4.\n` +
              `If the user quotes option text, match it to the numbered list below.\n` +
              `Never output prose.\n\n` +
              `Options:\n` +
              `1) ${currentTurn.question.options[0]}\n` +
              `2) ${currentTurn.question.options[1]}\n` +
              `3) ${currentTurn.question.options[2]}\n` +
              `4) ${currentTurn.question.options[3]}\n\n` +
              `User input:\n${userText}`
          }
        ]
      }
    ];

    try {
      const resp = await geminiGenAI({
        model: "gemini-2.0-flash",
        messages: content,
        system_instruction:
          "Output strictly JSON that matches the response schema. No prose, no markdown.",
        config: {
          responseMimeType: "application/json",
          responseSchema: MostLeastSchema
        }
      });

      const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      const out = JSON.parse(text);
      if (
        Number.isInteger(out.most) &&
        out.most >= 1 &&
        out.most <= 4 &&
        Number.isInteger(out.least) &&
        out.least >= 1 &&
        out.least <= 4 &&
        out.most !== out.least
      ) {
        return { most: out.most, least: out.least };
      }
      return null;
    } catch {
      return null;
    }
  }

  // ---------- Engine integration ----------
  private askNext(): IkigaiTurn {
    const turnWithMeta = genIkigaiQuestion(this.engine) as any; // contains _meta
    this.lastMeta = turnWithMeta._meta || null;

    const turn: IkigaiTurn = {
      question: turnWithMeta.question,
      state: turnWithMeta.state
    };

    this.lastTurn = turn;

    // For audit/UI
    this.ikigai.questions.push({
      question: turn.question.text,
      options: turn.question.options
    });
    this.ikigai.progress = turn.state;

    return turn;
  }

  // ---------- Main step ----------
  async step(message: string) {
    // If we haven't shown a question yet, show one
    if (!this.lastTurn) {
      const next = this.askNext();
      const md = this.renderTurnMarkdown(next);
      return { userReply: md, endFocus: false };
    }

    // 1) Try strict JSON first (power users)
    let reply: IkigaiUserReply | null = this.tryParseJsonReply(message);

    // 2) Otherwise run through Gemini coercion
    if (!reply) {
      reply = await this.coerceMostLeastWithAI(message, this.lastTurn);
    }

    // 3) If still invalid, re-ask same question with a nudge
    if (!reply) {
      const md =
        this.renderTurnMarkdown(this.lastTurn) +
        `\n\n⚠️ I couldn't understand that. Please tell me which option is MOST and which is LEAST (e.g., "1 most, 3 least").`;
      return { userReply: md, endFocus: false };
    }

    // 4) Apply reply using exact mapping (_meta) for the shown block
    if (!this.lastMeta) {
      const md =
        this.renderTurnMarkdown(this.lastTurn) +
        `\n\n⚠️ Internal mapping was missing. Please reply again.`;
      return { userReply: md, endFocus: false };
    }

    applyIkigaiReply(this.engine, reply, this.lastMeta);

    // Clear the consumed turn/meta
    this.lastTurn = null;
    this.lastMeta = null;

    // 5) If finished, return final JSON
    if (ikigaiIsFinished(this.engine)) {
      const final = getIkigaiFinal(this.engine);
      return {
        userReply: "✅ Ikigai exercise completed. Returning final results JSON to the Lead Agent.",
        finalIkigai: final,
        endFocus: true
      };
    }

    // 6) Otherwise, continue with the next block
    const next = this.askNext();
    const md = this.renderTurnMarkdown(next);
    return { userReply: md, endFocus: false };
  }
}
