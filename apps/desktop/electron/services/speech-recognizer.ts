import { spawn } from "node:child_process";
import path from "node:path";

export class SpeechRecognizerService {
 private readonly whisperRoot = path.resolve(
  process.cwd(),
  "../../whisper.cpp",
);

  private readonly whisperCli = path.join(
    this.whisperRoot,
    "build",
    "bin",
    "whisper-cli",
  );

  private readonly model = path.join(
    this.whisperRoot,
    "models",
    "ggml-small.bin",
  );

  async transcribe(audioFile: string): Promise<string> {
    console.log("CWD:", process.cwd());
console.log("Whisper CLI:", this.whisperCli);
    return new Promise((resolve, reject) => {
      let output = "";
      let error = "";

      const process = spawn(this.whisperCli, [
        "-m",
        this.model,
        "-f",
        audioFile,
        "-l",
        "en",
        "-nt",
      ]);

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        error += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(
              `Whisper failed (${code})\n${error}`,
            ),
          );
        }

        resolve(output.trim());
      });

      process.on("error", reject);
    });
  }
}

export const speechRecognizerService = new SpeechRecognizerService();