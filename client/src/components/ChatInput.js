import React, { useState } from 'react';

export default function ChatInput({ orchestrator, disabled }) {
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    orchestrator.onUserReply(text);
    setText('');
  };

  return (
    <div className="mt-3 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        disabled={disabled}
        placeholder={disabled ? 'wait…' : 'type here and hit enter'}
        className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      />
      <button
        onClick={send}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg ${disabled ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
      >
        Send
      </button>
    </div>
  );
}
