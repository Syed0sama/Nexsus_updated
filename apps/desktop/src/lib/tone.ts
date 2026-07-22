// src/lib/tone.ts
// Synthesizes short activation/completion chimes with the Web Audio API —
// no audio assets needed.

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

function playTone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  volume = 0.05
) {
  const audioCtx = getContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    freqEnd,
    audioCtx.currentTime + duration
  );

  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + duration
  );

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

/** Rising two-note chime played when listening begins. */
export function playListenTone() {
  playTone(660, 880, 0.12);
  setTimeout(() => playTone(880, 1320, 0.1), 90);
}

/** Soft falling tone played when a response finishes. */
export function playDoneTone() {
  playTone(520, 320, 0.15, 0.035);
}