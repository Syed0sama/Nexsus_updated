// src/components/VoiceCore.tsx
import { useEffect, useRef } from "react";

export type CoreState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceCoreProps {
  state: CoreState;
  onActivate: () => void;
}

const STATE_LABEL: Record<CoreState, string> = {
  idle: "TAP TO SPEAK",
  listening: "LISTENING",
  thinking: "PROCESSING",
  speaking: "SPEAKING",
};

const BAR_COUNT = 24;

export default function VoiceCore({ state, onActivate }: VoiceCoreProps) {
  const barsRef = useRef<HTMLDivElement>(null);

  // Drives the speaking-state waveform with a stylized (non-audio-reactive)
  // animation. Swap the amplitude source here if you later pipe real
  // playback levels in from the main process.
  useEffect(() => {
    if (state !== "speaking" || !barsRef.current) return;

    const bars = Array.from(
      barsRef.current.querySelectorAll<HTMLDivElement>(".core-bar")
    );

    let frame: number;
    let t = 0;

    const animate = () => {
      t += 0.12;
      bars.forEach((bar, i) => {
        const phase = i * 0.4;
        const amp =
          0.35 +
          0.65 *
            Math.abs(Math.sin(t + phase) * Math.cos(t * 0.5 + phase * 0.3));
        bar.style.transform = `scaleY(${amp})`;
      });
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [state]);

  return (
    <button
      className={`voice-core voice-core--${state}`}
      onClick={onActivate}
      aria-label={STATE_LABEL[state]}
    >
      <span className="core-ring core-ring--outer" />
      <span className="core-ring core-ring--mid" />

      <span className="core-orb">
        {state === "speaking" ? (
          <div className="core-bars" ref={barsRef}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <div className="core-bar" key={i} />
            ))}
          </div>
        ) : state === "thinking" ? (
          <div className="core-particles">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                className="core-particle"
                key={i}
                style={{ animationDelay: `${i * -0.5}s` }}
              />
            ))}
          </div>
        ) : (
          <span className="core-glow" />
        )}
      </span>

      <span className="core-label">{STATE_LABEL[state]}</span>
    </button>
  );
}