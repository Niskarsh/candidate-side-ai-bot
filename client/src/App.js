import React, { useEffect, useMemo, useState } from 'react';
import { Orchestrator } from './agent/orchestrator';
import ChatInput from './components/ChatInput';
import ProfileCard from './components/ProfileCard';

import 'App.css';

export default function App() {
  const [trace, setTrace] = useState([]);
  const [url, setUrl] = useState('https://www.linkedin.com/in/niskarsh-kumar-1a2a25133');
  const [state, setState] = useState({ step: 'await_linkedin_url', messages: [], profile: null });


  const orchestrator = useMemo(() => new Orchestrator((e) => setTrace(t => [...t, { ts: Date.now(), ...e }])), []);
  useEffect(() => { orchestrator.subscribe(setState); }, [orchestrator]);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-2xl shadow p-4 lg:col-span-2">
          <h1 className="text-2xl font-bold">Kari · Your Sassy Career Mentor</h1>
          <p className="text-sm text-gray-600">I’ll pull your LinkedIn, then grill you (nicely) for the juicy impact, stack, and outcomes. We idle only when the profile is chef’s kiss.</p>
        </section>


        <section className="bg-white rounded-2xl shadow p-4">
          <label className="block text-sm font-medium">LinkedIn URL</label>
          <div className="mt-2 flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/in/..." className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={() => orchestrator.onSubmitLinkedIn(url)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Build with AI</button>
          </div>


          <div className="mt-4 border rounded-xl p-3 h-[58vh] overflow-auto bg-gray-50">
            {state.messages?.length === 0 && <div className="text-sm text-gray-500">No chat yet. Drop your LinkedIn and I’ll start.</div>}
            {state.messages?.map((m, i) => (
              <div key={i} className={`mb-3 ${m.from === 'bot' ? '' : 'text-right'}`}>
                <div className={`inline-block px-3 py-2 rounded-2xl ${m.from === 'bot' ? 'bg-white border' : 'bg-indigo-600 text-white'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <ChatInput orchestrator={orchestrator} disabled={state.step !== 'awaiting_user'} />
        </section>


        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold mb-3">Profile Preview</h2>
          {state.profile ? <ProfileCard p={state.profile} /> : <div className="text-sm text-gray-500">No profile yet.</div>}
        </section>


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