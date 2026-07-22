import { useEffect, useRef, useState } from "react";
import VoiceCore, { type CoreState } from "./components/VoiceCore";
import { playListenTone, playDoneTone } from "./lib/tone";
import "./App.css";

interface ChatMessage {
  role: "user" | "nexus";
  text: string;
}

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  const sendText = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setCoreState("thinking");

    const res = await window.nexus.invoke("brain", { text });

    let responseText = JSON.stringify(res, null, 2);
    if (res?.type === "confirmation" && res?.data) {
      responseText = `Message ready:\n\nTo: ${res.data.contact}\n\nMessage: ${res.data.message}\n\nSend? (yes/no)`;
    } else if (typeof res?.data === "string") {
      responseText = res.data;
    }

    setMessages((prev) => [...prev, { role: "nexus", text: responseText }]);

    // Simulated "speaking" duration proportional to reply length —
    // swap this for a real TTS-playback-started/finished IPC event
    // once the main process exposes one.
    setCoreState("speaking");
    const speakMs = Math.min(4000, 800 + responseText.length * 18);
    await new Promise((r) => setTimeout(r, speakMs));

    playDoneTone();
    setCoreState("idle");
  };

  const handleSend = () => {
    const text = input;
    setInput("");
    sendText(text);
  };

  const handleCoreActivate = () => {
    if (coreState !== "idle") return;
    playListenTone();
    setCoreState("listening");

    // TODO: wire this to your real voice-capture flow, e.g.
    // window.nexus.invoke("voice", { action: "start" })
    // and transition to "thinking" once transcription resolves.
    // Placeholder auto-transition so the UI is testable standalone:
    setTimeout(() => setCoreState("idle"), 2500);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Nexus</h1>
        <span className="app-status">{coreState.toUpperCase()}</span>
      </header>

      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role}`}>
            <span className="msg-role">{m.role}</span>
            {m.text}
          </div>
        ))}
      </div>

      <div className="control-bar">
        <VoiceCore state={coreState} onActivate={handleCoreActivate} />
        <input
          className="text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a command, or tap the core to speak"
        />
        <button className="send-btn" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}