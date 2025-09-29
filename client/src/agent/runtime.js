import { tools } from '../tools/registry';


export class AgentRuntime {
    constructor({ onEvent } = {}) {
        this.onEvent = onEvent || (() => { });
        this.context = { profile: null };
    }
    emit(e) { this.onEvent(e); }
    getTool(name) {
        const t = tools[name];
        if (!t) throw new Error(`Tool not found: ${name}`);
        return t;
    }
    async callTool(name, input) {
        this.emit({ type: 'tool:start', name, input });
        try {
            const result = await this.getTool(name)(input, this);
            this.emit({ type: 'tool:result', name, result });
            return result;
        }
        catch (err) {
            this.emit({ type: 'tool:error', name, error: String(err?.message || err) });
            throw err;
        }
    }
}