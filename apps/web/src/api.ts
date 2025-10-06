const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

export async function hello() {
  const res = await fetch(`${API_BASE}/api/chat/hello`);
  if (!res.ok) throw new Error("hello_failed");
  return res.json();
}

export async function sendChat(message: string) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
