import { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const send = async () => {
    if (!input.trim()) return;

    // user message add
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    // call Nexus brain
    const res = await window.nexus.invoke("brain", {
      text: input,
    });

   let responseText = JSON.stringify(res, null, 2);

if (
  res?.type === "confirmation" &&
  res?.data
) {
  responseText = 
`Message ready:

To: ${res.data.contact}

Message: ${res.data.message}

Send? (yes/no)`;
}

const botMsg = {
  role: "nexus",
  text: responseText,
};

    setMessages((prev) => [...prev, botMsg]);

    setInput("");
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Nexus</h2>

      {/* CHAT WINDOW */}
      <div
        style={{
          height: "70vh",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: 10,
          marginBottom: 10,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <b>{m.role}:</b>
            <pre>{m.text}</pre>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, padding: 10 }}
          placeholder="Type command like: system info, ping, time"
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}