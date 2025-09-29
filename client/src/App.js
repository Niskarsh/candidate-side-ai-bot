import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Orchestrator } from './agent/orchestrator';
import './App.css';

export default function App() {
  // Orchestrator instance (one per mount)
  const orchestrator = useMemo(
    () => new Orchestrator((e) => setTrace((t) => [...t, { ts: Date.now(), ...e } ])),
    []
  );

  // UI state mirrors orchestrator state; start in 'intro'
  const [state, setState] = useState({ step: 'intro', messages: [], profile: null, error: undefined });
  const [trace, setTrace] = useState([]);

  // chat composer
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe(setState);
    return unsubscribe; // cleanup subscription when component unmounts
  }, [orchestrator]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await orchestrator.onUserReply(text);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-2">
        {/* Header */}
        <section className="bg-white rounded-2xl shadow p-4 lg:col-span-2">
          <h1 className="text-2xl font-bold">Kari · Your Sassy Career Mentor</h1>
          <p className="text-sm text-gray-600">
            Drop anything here—your goals, wins, or even your LinkedIn URL. I’ll pull highlights when you paste it, then help craft punchy, metric-driven bullets.
          </p>
        </section>

        {/* Chat panel */}
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="mt-1 border rounded-xl p-3 h-[58vh] overflow-auto bg-gray-50">
            {(!state.messages || state.messages.length === 0) && (
              <div className="text-sm text-gray-500">Say hi 👋 or paste your LinkedIn whenever you like.</div>
            )}
            {state.messages?.map((m, i) => (
              <div key={i} className={`mb-3 ${m.from === 'bot' ? '' : 'text-right'}`}>
                <div className={`inline-block px-3 py-2 rounded-2xl ${m.from === 'bot' ? 'bg-white border' : 'bg-indigo-600 text-white'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {state.error && <div className="text-sm text-red-600">⚠ {state.error}</div>}
          </div>

          {/* Single chat composer (controlled input) */}
          <div className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              placeholder="Type here… (paste LinkedIn URL anytime)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={state.step === 'thinking'}  // optional: pause while planner is working
            />
            <button
              onClick={send}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={state.step === 'thinking'}
            >
              Send
            </button>
          </div>
        </section>

        {/* Profile preview */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold mb-3">Profile Preview</h2>
          {state.profile ? (
            <div className="text-sm">
              <div><b>Name:</b> {state.profile.fullName || '—'}</div>
              <div><b>Headline:</b> {state.profile.headline || '—'}</div>
              <div><b>Top Skills:</b> {(state.profile.skills || []).slice(0,5).join(', ') || '—'}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No profile yet.</div>
          )}
        </section>

        {/* Reasoning trace (kept as-is) */}
        <section className="bg-white rounded-2xl shadow p-4 lg:col-span-2">
          <h2 className="font-semibold mb-3">Reasoning Trace</h2>
          <div className="space-y-2 max-h-[40vh] overflow-auto">
            {trace.map((e, i) => (
              <div key={i} className="text-xs border rounded-lg p-2">
                <div className="text-[10px] text-gray-500">{new Date(e.ts).toLocaleTimeString()}</div>
                <pre className="whitespace-pre-wrap m-0">{JSON.stringify(e, null, 2)}</pre>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
