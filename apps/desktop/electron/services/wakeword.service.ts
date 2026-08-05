import { ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { EventEmitter } from "node:events";
import { app } from "electron";
import { audioCaptureService } from "./audio-capture.service";

const PYTHON_PATH = "/home/osama/nexus_ai/wake-word-env/bin/python3";

class WakewordService extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  private running = false;
  private unsubscribe: (() => void) | null = null;
  private paused = false;

  start() {
    if (this.running) return;
    this.running = true;
    console.log("[wakeword] start() called");

    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, "python", "wakeword_listener.py")
      : path.join(process.cwd(), "electron", "services", "python", "wakeword_listener.py");
    console.log("[wakeword] scriptPath:", scriptPath);
    console.log("[wakeword] PYTHON_PATH:", PYTHON_PATH);
    this.pythonProcess = spawn(PYTHON_PATH, [scriptPath]);
    console.log("[wakeword] spawn() called, pid:", this.pythonProcess.pid);

    this.pythonProcess.stdin?.on("error", (err) => {
      console.error("[wakeword] python stdin error:", err.message);
    });

    this.pythonProcess.stdout?.on("data", (data: Buffer) => {
      data
        .toString()
        .split("\n")
        .filter(Boolean)
        .forEach((line) => {
          try {
            const result = JSON.parse(line);
            if (result.detected) {
              this.emit("wakeword-detected", result);
            }
          } catch {
            // incomplete JSON line, ignore
          }
        });
    });

    this.pythonProcess.stderr?.on("data", (d) => {
      console.error("[wakeword-python]", d.toString());
    });

    this.pythonProcess.on("exit", (code, signal) => {
      console.log(`[wakeword-python] exited. code=${code} signal=${signal}`);
      this.running = false;
    });

    this.pythonProcess.on("error", (err) => {
      console.error("[wakeword-python] spawn error:", err);
    });

    this.subscribeToAudio();
  }

  private subscribeToAudio() {
    // Subscribe to the single shared mic stream instead of spawning our own ffmpeg
    this.unsubscribe = audioCaptureService.subscribe((chunk: Buffer) => {
      if (this.pythonProcess?.stdin && !this.pythonProcess.stdin.destroyed) {
        this.pythonProcess.stdin.write(chunk);
      }
    });
    console.log("[wakeword] Subscribed to shared audio stream");
  }

  /**
   * Stops feeding audio to the wakeword listener without killing the
   * Python process (avoids the ~1-2s respawn/model-reload cost).
   * With no new audio arriving, the inference loop goes idle and
   * frees up CPU for the command-processing pipeline (whisper,
   * planner LLM, etc.) — which is the dominant contention on 4-core
   * hardware.
   */
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    console.log("[wakeword] paused (audio feed stopped)");
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.subscribeToAudio();
    console.log("[wakeword] resumed (audio feed restored)");
  }

  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.pythonProcess?.kill();
    this.pythonProcess = null;
    this.running = false;
    this.paused = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const wakewordService = new WakewordService();