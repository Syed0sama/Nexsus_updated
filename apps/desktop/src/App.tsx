import { useEffect, useRef, useState } from "react";
import VoiceCore, { type CoreState } from "./components/VoiceCore";
import { playListenTone, playResponseTone, playDoneTone } from "./lib/tone";
import "./App.css";

interface ChatMessage {
  role: "user" | "nexus";
  text: string;
}

// Matches the exact strings the backend emits over voice-state-changed.
// (Previously these keys didn't match the real backend values at all —
// "recording"/"idle" fell through to the `?? "idle"` fallback below and
// never reached the UI as distinct states.)
const PIPELINE_STATE_MAP: Record<string, CoreState> = {
  idle: "idle",
  greeting: "speaking",
  recording: "listening",
  thinking: "thinking",
};

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const logRef = useRef<HTMLDivElement>(null);
  const prevCoreStateRef = useRef<CoreState>("idle");

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  // Real voice-pipeline state -> UI status indicator.
  useEffect(() => {
    const unsubscribe = window.nexus.onVoiceStateChanged((state) => {
      const mapped = PIPELINE_STATE_MAP[state] ?? "idle";
      setCoreState(mapped);
    });
    return unsubscribe;
  }, []);

  // User ne jo bola (wake trigger + voice command transcript) -> chat log.
  useEffect(() => {
    const unsubscribe = window.nexus.onVoiceTranscript((text) => {
      setMessages((prev) => [...prev, { role: "user", text }]);
    });
    return unsubscribe;
  }, []);

  // Nexus ka voice-flow response (final reply) -> chat log.
  useEffect(() => {
    const unsubscribe = window.nexus.onVoiceResponse((text) => {
      setMessages((prev) => [...prev, { role: "nexus", text }]);
      // Backend has no explicit "speaking" voice-state-changed event for
      // the final answer (only "greeting" marks TTS-start explicitly) —
      // infer it here from the response event itself. The next
      // voice-state-changed ("idle", once TTS playback ends) naturally
      // clears this again.
      setCoreState("speaking");
    });
    return unsubscribe;
  }, []);

  // Fire state-specific chimes exactly once per transition — covers both
  // the real wake-word pipeline (recording/greeting via
  // voice-state-changed) and the inferred "speaking" state set above from
  // onVoiceResponse. Comparing against the previous state avoids
  // re-triggering the tone on every render while a state is held.
  useEffect(() => {
    const prev = prevCoreStateRef.current;
    if (prev !== "listening" && coreState === "listening") {
      playListenTone();
    }
    if (prev !== "speaking" && coreState === "speaking") {
      playResponseTone();
    }
    prevCoreStateRef.current = coreState;
  }, [coreState]);

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
    // once the main process exposes one. (Entering "speaking" here also
    // fires playResponseTone() via the effect above.)
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
    // No manual setState/setTimeout here — real pipeline drives
    // coreState via onVoiceStateChanged. This click just plays the
    // tone; the wake word still has to be spoken to start the flow.
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