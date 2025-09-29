import React, { useState } from "react";
import { sendChat } from "../api";

type Bubble = { role: "user" | "assistant"; text: string };

export default function Chat() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");

  async function onSend() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    setBubbles(b => [...b, { role: "user", text: msg }]);
    try {
      const { messages, followUpQuestion, profilePreview, focusedAgent } = await sendChat(msg);

      if (messages?.length) {
        setBubbles(b => [...b, ...messages.map((t: string) => ({ role: "assistant", text: t }))]);
      }
      if (followUpQuestion) {
        setBubbles(b => [...b, { role: "assistant", text: "❓ " + followUpQuestion }]);
      }
      if (profilePreview) {
        setBubbles(b => [...b, { role: "assistant", text: "🗂️ Profile (preview):\n" + JSON.stringify(profilePreview, null, 2) }]);
      }
      if (focusedAgent) {
        setBubbles(b => [...b, { role: "assistant", text: `🔎 In focus: ${focusedAgent}` }]);
      }
    } catch {
      setBubbles(b => [...b, { role: "assistant", text: "Sorry—something went wrong." }]);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "24px auto", fontFamily: "system-ui" }}>
      <h2>Orchestrated Candidate Assistant</h2>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, height: 520, overflow: "auto", background: "#fafafa" }}>
        {bubbles.map((b, i) => (
          <div key={i} style={{ textAlign: b.role === "user" ? "right" : "left", margin: "8px 0" }}>
            <div style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 14,
              background: b.role === "user" ? "#2563eb" : "#f1f5f9",
              color: b.role === "user" ? "white" : "#111",
              whiteSpace: "pre-wrap"
            }}>{b.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Say: pull my LinkedIn or paste the URL…"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
        />
        <button onClick={onSend} style={{ padding: "10px 16px", borderRadius: 8 }}>Send</button>
      </div>
    </div>
  );
}
