import React, { useEffect, useRef, useState } from "react";
import { hello, sendChat } from "../api";
import ProfilePanel from "./ProfilePanel";

type Bubble = { role: "user" | "assistant"; text: string };

export default function Chat() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<any>({});
  const initRef = useRef(false); // guard StrictMode double-run in dev

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const { messages, profilePreview } = await hello();
        if (messages?.length) {
          setBubbles(b => [...b, ...messages.map((t: string) => ({ role: "assistant", text: t }))]);
        }
        setProfile(profilePreview ?? {});
      } catch {
        // ignore
      }
    })();
  }, []);

  async function onSend() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    setBubbles(b => [...b, { role: "user", text: msg }]);
    try {
      const { messages, profilePreview } = await sendChat(msg);
      if (messages?.length) {
        setBubbles(b => [...b, ...messages.map((t: string) => ({ role: "assistant", text: t }))]);
      }
      if (profilePreview) setProfile(profilePreview);
    } catch {
      setBubbles(b => [...b, { role: "assistant", text: "Sorry—something went wrong." }]);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "24px auto", fontFamily: "system-ui", color: "#e2e8f0" }}>
      <h2>Orchestrated Candidate Assistant</h2>

      <div style={{ border: "1px solid #334155", borderRadius: 8, padding: 12, height: 420, overflow: "auto", background: "#0f172a" }}>
        {bubbles.map((b, i) => (
          <div key={i} style={{ textAlign: b.role === "user" ? "right" : "left", margin: "8px 0" }}>
            <div style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 14,
              background: b.role === "user" ? "#2563eb" : "#1f2937",
              color: b.role === "user" ? "white" : "#e5e7eb",
              whiteSpace: "pre-wrap"
            }}>
              {b.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste LinkedIn URL or say 'build my profile'…"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e2e8f0" }}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
        />
        <button onClick={onSend} style={{ padding: "10px 16px", borderRadius: 8 }}>Send</button>
      </div>

      {/* Fixed profile panel (no chat spam) */}
      <ProfilePanel profile={profile} />
    </div>
  );
}
