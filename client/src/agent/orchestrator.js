import { AgentRuntime } from './runtime';
import { ProfileBuilderAgent } from './profileBuilder';
import { extractFreeText, planWithLLM } from '../tools/api';
import { PLANNER_SYSTEM_PROMPT } from './promps';

// simple matcher so users can paste/link anywhere in the chat
const LINKEDIN_RE = /(https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s]+)/i;

const TOOL_SPECS = {
    profile_builder: {
      name: "ProfileBuilderAgent",
      description:
        "Given linkedinUrl, enriches profile with name, headline, skills, experiences (title, company, dates, description), educations, avatar. Writes to runtime.context.profile and returns the profile.",
      args: ["linkedinUrl"]
    },
    extract_free_text: {
      name: "extractFreeText",
      description:
        "Parses a user's free-text answer into a structured patch: {about_add?, skills_add?, experience_patch?{title?,company?,start?,end?,stack[],outcomes}}"
    }
  };
  
export class Orchestrator {
    constructor(onEvent) {
        this.runtime = new AgentRuntime({ onEvent });
        this.state = {
            step: 'intro',
            profile: null,
            messages: [
                { from: 'bot', text: "Hey, I'm Kari—your sassy career mentor 😎 Tell me what you're targeting next, or drop your LinkedIn whenever you're ready and I’ll pull highlights." }
            ]
        };

        this.askHistory = []; // {fields: ['impact','stack'], ts: ...}
    }

    subscribe(fn) {
        this._listener = fn;
        fn(this.state);
        return () => {
            if (this._listener === fn) this._listener = null;
        };
    }

    setState(next) { this.state = { ...this.state, ...next }; this._listener && this._listener(this.state); }


    pushBot(text) { this.setState({ messages: [...this.state.messages, { from: 'bot', text }] }); }
    pushUser(text) { this.setState({ messages: [...this.state.messages, { from: 'user', text }] }); }


    async runPlanner({ linkedinUrl, last_user_message } = {}) {
        // const plan = await planWithLLM({ linkedinUrl }, this.state, last_user_message);
        const plan = await planWithLLM(
            { linkedinUrl, tools: TOOL_SPECS, idempotency_key: `${linkedinUrl || 'nolink'}:${this.state.messages.length}`  },
            { ...this.state, askHistory: this.askHistory },
            last_user_message,
            { system: PLANNER_SYSTEM_PROMPT } // <-- richer planner brief
        );
        if (plan?.action === 'spawn_profile_builder') {
            this.setState({ step: 'fetching_profile' });
            const profile = await ProfileBuilderAgent({ linkedinUrl: plan.args.linkedinUrl || linkedinUrl }, this.runtime);
            this.setState({ step: 'thinking', profile });
            return this.runPlanner({ linkedinUrl });
        }
        // if (plan?.action === 'request_clarification') {
        //     // avoid repeating the same ask back-to-back
        //     const sig = (plan.args.fields || []).sort().join(',');
        //     const lastSig = (this.askHistory.at(-1)?.fields || []).sort().join(',');
        //     if (sig === lastSig) {
        //         // tweak the wording locally for variety
        //         const variants = [
        //             "Give me one brag: what changed and by how much?",
        //             "Pick a win: title, stack, and the numbers you moved.",
        //             "What did you ship lately, with metrics? Keep it punchy."
        //         ];
        //         const v = variants[Math.floor(Math.random() * variants.length)];
        //         this.pushBot(v);
        //     } else {
        //         this.pushBot(plan.args.question);
        //     }
        //     this.askHistory.push({ fields: plan.args.fields || [], ts: Date.now() });
        //     this.setState({ step: 'awaiting_user' });
        //     return;
        // }
        if (plan?.action === 'request_clarification') {
            const q = plan?.args?.question || "What’s one measurable win from your recent role?";
            this.pushBot(q);
            this.askHistory.push({ fields: plan.args?.fields || [], ts: Date.now() });
            this.setState({ step: 'awaiting_user' });
            return;
        }
        if (plan?.action === 'finalize_profile') {
            this.setState({ step: 'idle' });
            this.pushBot("Love it. Profile's tight. Wanna peek at matches next?");
            return;
        }
        if (plan?.action === 'assistant_message') {
            this.pushBot(plan.args.text);
            this.setState({ step: 'awaiting_user' });
            return;
          }
        // default: defer to planner's voice, but keep a friendly nudge
        // this.pushBot('Tell me your latest role (title, stack) and one measurable win—or paste your LinkedIn and I’ll auto-fill.');
        // this.setState({ step: this.state.profile ? 'awaiting_user' : 'intro' });

    }


    async onSubmitLinkedIn(url) {
        this.setState({ step: 'thinking', error: undefined });
        this.pushBot('Sweet — pulling highlights from your LinkedIn… ⏳');

        await this.runPlanner({ linkedinUrl: url });
    }


    async onUserReply(text) {
        this.pushUser(text);
        // If user pasted a LinkedIn link at any time, prioritize enrichment
        const m = (text || '').match(LINKEDIN_RE);
        if (m) {
            return this.onSubmitLinkedIn(m[1]);
        }


        // 1) Extract structured patch from free text
        const p0 = this.runtime.context.profile || {};
        const patch = await extractFreeText(text, p0);

        // 2) Merge patch sanely
        const merged = { ...p0 };

        if (patch.about_add) {
            merged.about = merged.about ? `${merged.about}\n${patch.about_add}` : patch.about_add;
        }
        if (Array.isArray(patch.skills_add) && patch.skills_add.length) {
            const add = patch.skills_add.map(s => s.trim()).filter(Boolean);
            merged.skills = Array.from(new Set([...(merged.skills || []), ...add]));
        }
        if (patch.experience_patch) {
            merged.experiences = merged.experiences || [];
            // patch the latest experience (index 0) or create one
            const ex = merged.experiences[0] || (merged.experiences[0] = {});
            Object.assign(ex, {
                title: patch.experience_patch.title ?? ex.title,
                company: patch.experience_patch.company ?? ex.company,
                date_range: ex.date_range || ((patch.experience_patch.start || patch.experience_patch.end)
                    ? `${patch.experience_patch.start || '—'} - ${patch.experience_patch.end || 'present'}`
                    : ex.date_range),
                description: patch.experience_patch.outcomes
                    ? (ex.description ? `${ex.description}\n${patch.experience_patch.outcomes}` : patch.experience_patch.outcomes)
                    : ex.description
            });
            if (Array.isArray(patch.experience_patch.stack)) {
                merged.skills = Array.from(new Set([...(merged.skills || []), ...patch.experience_patch.stack]));
            }
        }

        this.runtime.context.profile = merged;
        this.setState({ profile: merged, step: 'thinking' });


        // 3) Re-plan with updated state so we don’t ask the same thing
        await this.runPlanner({ linkedinUrl: (this.state.goal || {}).linkedinUrl, last_user_message: text });
    }

}