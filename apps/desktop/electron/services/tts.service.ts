// electron/services/tts.service.ts

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { toUrduScript } from "./urdu-scriptifier";

const VOICES = {
  en: "en-US-AriaNeural",
  ur: "ur-PK-UzmaNeural",
} as const;

function convertWslPathToWindows(wslPath: string): string {
  const mntMatch = wslPath.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);

  if (mntMatch) {
    const drive = mntMatch[1].toUpperCase();
    const rest = mntMatch[2].replace(/\//g, "\\");
    return `${drive}:\\${rest}`;
  }

  const distro = process.env.WSL_DISTRO_NAME ?? "Ubuntu";
  const rest = wslPath.replace(/^\//, "").replace(/\//g, "\\");
  return `\\\\wsl.localhost\\${distro}\\${rest}`;
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

async function synthesizeToFile(
  text: string,
  language: "en" | "ur"
): Promise<string> {
  const voice = VOICES[language];

  // The Urdu neural voice is trained on native Urdu script, not
  // Roman Urdu. Feeding it Latin-script text produces a mispronounced,
  // "foreign accent" result, so convert the script first.
  const speechText =
    language === "ur" ? await toUrduScript(text) : text;

  console.log("[TTS] Speech text (post-conversion):", speechText);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  const outputDir = path.join(os.tmpdir(), `nexus-tts-${randomUUID()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  await tts.toFile(outputDir, speechText);

  return path.join(outputDir, "audio.mp3");
}

function playAudioFile(filePath: string): Promise<void> {
  const windowsPath = convertWslPathToWindows(filePath);

  console.log("[TTS] Windows path for playback:", windowsPath);

  const script = `
Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([Uri]::new('${escapePowerShell(windowsPath)}'))
Start-Sleep -Milliseconds 500
$player.Play()
while ($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }
Start-Sleep -Seconds $player.NaturalDuration.TimeSpan.TotalSeconds
$player.Stop()
$player.Close()
`.trim();

  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", script],
      { stdio: "inherit" }
    );

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Audio playback failed (${code})`));
    });
  });
}

export async function speak(
  text: string,
  language: "en" | "ur" = "en"
): Promise<void> {
  console.log("[TTS] Synthesizing:", text);

  console.time("[Timing] TTS synthesis");
  const filePath = await synthesizeToFile(text, language);
  console.timeEnd("[Timing] TTS synthesis");

  console.log("[TTS] Audio file created:", filePath);

  console.time("[Timing] Audio playback");
  await playAudioFile(filePath);
  console.timeEnd("[Timing] Audio playback");

  console.log("[TTS] Playback finished");
}