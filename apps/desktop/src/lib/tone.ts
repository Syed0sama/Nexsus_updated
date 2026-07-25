// src/lib/tone.ts
// Synthesizes layered, futuristic UI chimes with the Web Audio API —
// no audio assets needed.

let ctx: AudioContext | null = null;

async function getContext(): Promise<AudioContext> {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

/**
 * Short feedback-delay "space" send so tones have a bit of tail/room
 * instead of sounding flat and dry.
 *
 * IMPORTANT: DelayNode/GainNode/BiquadFilterNode have no .stop() — the
 * delay->feedback->damp->delay cycle here keeps processing audio forever
 * once created, unlike an OscillatorNode which halts at .stop(). Every
 * previous call to this function left its feedback loop running
 * indefinitely in the background, so each played tone permanently added
 * a live processing chain that never went away. Over a conversation with
 * many tones, those chains piled up and starved the audio thread — which
 * is what caused the system TTS to stutter and old tone tails to bleed
 * into later speech. We now explicitly disconnect the whole chain once
 * its tail has audibly decayed (feedback gain 0.32 means it's inaudible
 * well before 1.6s), so nothing keeps running past that.
 */
function createSpaceSend(audioCtx: AudioContext, mix: number): AudioNode {
  const input = audioCtx.createGain();
  const delay = audioCtx.createDelay();
  delay.delayTime.value = 0.11;
  const feedback = audioCtx.createGain();
  feedback.gain.value = 0.32;
  const damp = audioCtx.createBiquadFilter();
  damp.type = "lowpass";
  damp.frequency.value = 2400;
  const wet = audioCtx.createGain();
  wet.gain.value = mix;

  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(damp);
  damp.connect(delay);
  delay.connect(wet);
  wet.connect(audioCtx.destination);

  window.setTimeout(() => {
    input.disconnect();
    delay.disconnect();
    feedback.disconnect();
    damp.disconnect();
    wet.disconnect();
  }, 1600);

  return input;
}

interface LayerOpts {
  type?: OscillatorType;
  freqStart: number;
  freqEnd: number;
  detune?: number;
  peakGain: number;
  attack?: number;
  hold?: number;
  release?: number;
  filterStart?: number;
  filterEnd?: number;
  startOffset?: number;
}

/**
 * One oscillator voice with a smooth attack/hold/release envelope.
 * Oscillator + its gain/filter nodes are explicitly disconnected shortly
 * after they finish, for the same reason as createSpaceSend above — don't
 * rely on GC alone to reclaim the graph promptly.
 */
function playLayer(audioCtx: AudioContext, spaceSend: AudioNode, opts: LayerOpts) {
  const {
    type = "sine",
    freqStart,
    freqEnd,
    detune = 0,
    peakGain,
    attack = 0.035,
    hold = 0.05,
    release = 0.22,
    filterStart,
    filterEnd,
    startOffset = 0,
  } = opts;

  const t0 = audioCtx.currentTime + startOffset;
  const tEnd = t0 + attack + hold + release;

  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + attack + hold);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peakGain, t0 + attack);
  gain.gain.setValueAtTime(peakGain, t0 + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

  let node: AudioNode = osc;
  let filter: BiquadFilterNode | null = null;
  if (filterStart !== undefined && filterEnd !== undefined) {
    filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(filterStart, t0);
    filter.frequency.exponentialRampToValueAtTime(filterEnd, tEnd);
    osc.connect(filter);
    node = filter;
  }

  node.connect(gain);
  gain.connect(audioCtx.destination);
  gain.connect(spaceSend);

  osc.start(t0);
  osc.stop(tEnd + 0.05);

  const cleanupDelayMs = (startOffset + attack + hold + release + 0.1) * 1000;
  window.setTimeout(() => {
    osc.disconnect();
    filter?.disconnect();
    gain.disconnect();
  }, cleanupDelayMs);
}

/**
 * Sci-fi "activation" chime played when listening begins — a rising
 * layered sweep (sub pulse + core tone + bright shimmer).
 */
export async function playListenTone() {
  const audioCtx = await getContext();
  const space = createSpaceSend(audioCtx, 0.22);

  playLayer(audioCtx, space, {
    type: "sine",
    freqStart: 180,
    freqEnd: 260,
    peakGain: 0.05,
    attack: 0.04,
    hold: 0.05,
    release: 0.28,
  });

  playLayer(audioCtx, space, {
    type: "sine",
    freqStart: 520,
    freqEnd: 1040,
    peakGain: 0.055,
    attack: 0.03,
    hold: 0.06,
    release: 0.3,
    filterStart: 900,
    filterEnd: 4200,
  });

  playLayer(audioCtx, space, {
    type: "triangle",
    freqStart: 1040,
    freqEnd: 1560,
    detune: 8,
    peakGain: 0.028,
    attack: 0.05,
    hold: 0.04,
    release: 0.26,
    startOffset: 0.05,
  });
}

/**
 * "Ready to speak" cue — triangle-based descending two-tone ping, timbrally
 * distinct from the listen tone.
 */
export async function playResponseTone() {
  const audioCtx = await getContext();
  const space = createSpaceSend(audioCtx, 0.2);

  playLayer(audioCtx, space, {
    type: "triangle",
    freqStart: 880,
    freqEnd: 660,
    peakGain: 0.05,
    attack: 0.025,
    hold: 0.05,
    release: 0.25,
    filterStart: 3800,
    filterEnd: 1200,
  });

  playLayer(audioCtx, space, {
    type: "sine",
    freqStart: 440,
    freqEnd: 330,
    peakGain: 0.04,
    attack: 0.03,
    hold: 0.05,
    release: 0.3,
    startOffset: 0.06,
  });
}

/** Soft falling tone with a light tail, played when a response finishes. */
export async function playDoneTone() {
  const audioCtx = await getContext();
  const space = createSpaceSend(audioCtx, 0.16);

  playLayer(audioCtx, space, {
    type: "sine",
    freqStart: 480,
    freqEnd: 260,
    peakGain: 0.038,
    attack: 0.03,
    hold: 0.02,
    release: 0.32,
  });
}