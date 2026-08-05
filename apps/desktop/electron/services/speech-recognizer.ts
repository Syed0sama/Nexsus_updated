import { spawn } from "node:child_process";
import path from "node:path";
import { needsRomanization, romanizeToUrdu } from "./romanizer";

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
    "ggml-base.bin",
  );

  async transcribe(audioFile: string): Promise<string> {
    console.log("CWD:", process.cwd());
    console.log("Whisper CLI:", this.whisperCli);

    const rawOutput = await new Promise<string>((resolve, reject) => {
      let output = "";
      let error = "";

      const process = spawn(this.whisperCli, [
        "-m",
        this.model,
        "-f",
        audioFile,
        "-l",
        "en",
        "-t", "4",
        "-bs","1",
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

    // Whisper's "auto" mode sometimes detects Urdu speech as Hindi/Devanagari
    // or writes Urdu in Arabic script. Convert either case to Roman Urdu
    // so downstream language-detector.ts (which expects Latin script) works.
    let text = rawOutput;

    if (needsRomanization(rawOutput)) {
      try {
        text = await romanizeToUrdu(rawOutput);
        console.log("[SpeechRecognizer] Romanized:", text);
      } catch (err) {
        console.warn(
          "[SpeechRecognizer] Romanization failed, falling back to raw output:",
          err,
        );
        text = rawOutput;
      }
    }

    // Whisper sometimes hallucinates a repeated copy of the same phrase
    // on short clips or clips with trailing silence (e.g. "X batao, X batao,").
    // Detect and collapse an exact/near-exact repeat down to a single copy.
    const deduped = this.dedupRepeatedPhrase(text);

    if (deduped !== text) {
      console.log("[SpeechRecognizer] Deduped repeated phrase:", deduped);
    }

    // Whisper sometimes outputs Roman Urdu with macrons/diacritics
    // (e.g. "batāo" instead of "batao", "Merī" instead of "Meri").
    // Strip these to plain ASCII so downstream regex checks (isQuestion,
    // memory key matching, personalFactMarkers, etc.) match reliably.
    const normalized = this.normalizeAccents(deduped);

    if (normalized !== deduped) {
      console.log("[SpeechRecognizer] Normalized accents:", normalized);
    }

    return normalized;
  }

  private dedupRepeatedPhrase(text: string): string {
    const trimmed = text.trim();
    const half = Math.floor(trimmed.length / 2);

    if (half < 4) {
      return trimmed;
    }

    const firstHalf = trimmed.slice(0, half).trim();
    const secondHalf = trimmed.slice(half).trim();

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[.,]/g, "").trim();

    const normalizedFirst = normalize(firstHalf);
    const normalizedSecond = normalize(secondHalf);

    const checkLength = Math.min(normalizedFirst.length, 15);

    if (
      normalizedFirst.length > 3 &&
      normalizedSecond.startsWith(normalizedFirst.slice(0, checkLength))
    ) {
      return firstHalf.replace(/[,.]$/, "").trim();
    }

    return trimmed;
  }

  private normalizeAccents(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}

export const speechRecognizerService = new SpeechRecognizerService();