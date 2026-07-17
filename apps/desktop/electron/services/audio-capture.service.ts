import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export class AudioCaptureService {
  private process: ChildProcess | null = null;
  private outputFile: string | null = null;

  start(): string {
    if (this.process) {
      throw new Error("Audio capture already running.");
    }

    this.outputFile = path.join(
      os.tmpdir(),
      `nexus-audio-${Date.now()}.wav`,
    );

    this.process = spawn("ffmpeg", [
      "-y",
      "-f",
      "pulse",
      "-i",
      "default",
      "-ac",
      "1",
      "-ar",
      "16000",
      this.outputFile,
    ]);

    this.process.stderr?.on("data", () => {});

    this.process.on("error", (err) => {
      console.error("[AudioCapture]", err);
    });

    return this.outputFile;
  }

  async stop(): Promise<string> {
    if (!this.process || !this.outputFile) {
      throw new Error("Audio capture is not running.");
    }

    this.process.kill("SIGINT");

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!fs.existsSync(this.outputFile)) {
      throw new Error("Recording file not found.");
    }

    const file = this.outputFile;

    this.process = null;
    this.outputFile = null;

    return file;
  }

  isRecording(): boolean {
    return this.process !== null;
  }
}

export const audioCaptureService = new AudioCaptureService();