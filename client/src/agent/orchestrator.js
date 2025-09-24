import { planWithLLM } from '../tools/api';
import { AgentRuntime } from './runtime';
import { ProfileBuilderAgent } from './profileBuilder';


export class Orchestrator {
    constructor(onEvent) {
        this.runtime = new AgentRuntime({ onEvent });
        this.state = { step: 'await_linkedin_url', profile: null, messages: [] };
    }
    subscribe(fn) { this._listener = fn; fn(this.state); }
    setState(next) { this.state = { ...this.state, ...next }; this._listener && this._listener(this.state); }


    pushBot(text) { this.setState({ messages: [...this.state.messages, { from: 'bot', text }] }); }
    pushUser(text) { this.setState({ messages: [...this.state.messages, { from: 'user', text }] }); }


    async runPlanner({ linkedinUrl, last_user_message } = {}) {
        const plan = await planWithLLM({ linkedinUrl }, this.state, last_user_message);
        if (plan?.action === 'spawn_profile_builder') {
            this.setState({ step: 'fetching_profile' });
            const profile = await ProfileBuilderAgent({ linkedinUrl: plan.args.linkedinUrl || linkedinUrl }, this.runtime);
            this.setState({ step: 'thinking', profile });
            return this.runPlanner({ linkedinUrl });
        }
        if (plan?.action === 'request_clarification') {
            this.setState({ step: 'awaiting_user' });
            this.pushBot(plan.args.question);
            this._pendingFields = plan.args.fields || [];
            return;
        }
        if (plan?.action === 'finalize_profile') {
            this.setState({ step: 'idle' });
            this.pushBot("Love it. Profile's tight. Wanna peek at matches next?");
            return;
        }
        // default
        this.pushBot('Tell me a recent win: what changed, with numbers.');
        this.setState({ step: 'awaiting_user' });
    }


    async onSubmitLinkedIn(url) {
        this.setState({ step: 'thinking', error: undefined });
        this.pushBot('Nice. Pulling the good stuff from your LinkedIn…');
        await this.runPlanner({ linkedinUrl: url });
    }


    async onUserReply(text) {
        this.pushUser(text);
        // merge into profile heuristically
        const p = this.runtime.context.profile || (this.runtime.context.profile = {});
        if (this._pendingFields?.length) {
            const t = text.trim();
            if (this._pendingFields.includes('impact')) {
                p.experiences = p.experiences || [];
                const latest = p.experiences[0] || (p.experiences[0] = {});
                latest.description = latest.description ? `${latest.description}\n${t}` : t;
            }
            if (this._pendingFields.includes('stack')) {
                const additions = t.split(/[,|\n]/).map(s => s.trim()).filter(Boolean);
                p.skills = Array.from(new Set([...(p.skills || []), ...additions]));
            }
            if (this._pendingFields.includes('about')) {
                p.about = p.about ? `${p.about}\n${t}` : t;
            }
            this._pendingFields = [];
            this.runtime.context.profile = p;
            this.setState({ profile: p });
        }
        this.setState({ step: 'thinking' });
        await this.runPlanner({ linkedinUrl: (this.state.goal || {}).linkedinUrl, last_user_message: text });
    }
}