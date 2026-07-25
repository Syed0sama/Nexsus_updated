// Owns the ONE AND ONLY microphone stream for the entire app lifetime.
// Spawns a single long-lived ffmpeg process capturing 16kHz mono
// 16-bit PCM audio, and broadcasts every chunk to any number of
// subscribers (wake-word detector, command recorder, etc).
//
// This is started once when the app boots and is never restarted.
// Nothing else in the app should ever call `spawn("ffmpeg", ...)`.

import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";

export type AudioSubscriber = (chunk: Buffer) => void;

class AudioCaptureService extends EventEmitter {
  private ffmpeg: ChildProcessWithoutNullStreams | null = null;
  private subscribers = new Set<AudioSubscriber>();
  private isRunning = false;
  private restartAttempts = 0;
  private readonly maxRestartAttempts = 3;

  start(): void {
    if (this.isRunning) {
      console.warn("[AudioCapture] Already running — ignoring duplicate start().");
      return;
    }

this.ffmpeg = spawn("ffmpeg", [
  "-f", "pulse",
  "-i", "RDPSource",
  "-ac", "1",
  "-ar", "16000",
  "-f", "s16le",
  "-acodec", "pcm_s16le",
  "pipe:1",
]);

    this.isRunning = true;

    this.ffmpeg.stdout.on("data", (chunk: Buffer) => {
      this.restartAttempts = 0; // reset once data is actually flowing
      for (const subscriber of this.subscribers) {
        subscriber(chunk);
      }
      this.emit("data", chunk);
    });

    this.ffmpeg.stderr.on("data", () => {});

    this.ffmpeg.on("close", (code) => {
      this.isRunning = false;
      this.ffmpeg = null;
      this.emit("closed", code);

      if (this.restartAttempts >= this.maxRestartAttempts) {
        console.error(
          `[AudioCapture] Gave up after ${this.maxRestartAttempts} failed restarts (last exit code ${code}). Check ffmpeg device args.`
        );
        return;
      }

      this.restartAttempts++;
      const delay = 1000 * this.restartAttempts;
      console.warn(`[AudioCapture] ffmpeg exited (code ${code}). Retry ${this.restartAttempts}/${this.maxRestartAttempts} in ${delay}ms.`);
      setTimeout(() => this.start(), delay);
    });

    this.ffmpeg.on("error", (err) => {
      console.error("[AudioCapture] Failed to start ffmpeg:", err);
      this.isRunning = false;
    });

    console.log("[AudioCapture] Single microphone stream started.");
  }

  subscribe(fn: AudioSubscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  stop(): void {
    this.ffmpeg?.kill();
    this.ffmpeg = null;
    this.isRunning = false;
  }
}

export const audioCaptureService = new AudioCaptureService();