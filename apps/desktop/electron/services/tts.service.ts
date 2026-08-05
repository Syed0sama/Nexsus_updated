// electron/services/tts.service.ts

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { spawn, execSync, ChildProcessByStdio } from "node:child_process";
import type { Writable, Readable } from "node:stream";
import path from "node:path";
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

// ---- Windows native temp dir (cached) ----
// We write TTS output directly into Windows' own temp folder (via the
// /mnt/c drvfs mount) instead of WSL's /tmp. That way playback later
// reads a local C:\ path instead of going through the slow
// \\wsl.localhost\ 9p network share, which was the real bottleneck.

let cachedWinTempWsl: string | null = null;

function getWindowsTempDirAsWsl(): string {
  if (cachedWinTempWsl) return cachedWinTempWsl;

  const raw = execSync(
    'powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'TEMP\')"'
  )
    .toString()
    .trim();

  const m = raw.match(/^([a-zA-Z]):\\(.*)$/);
  if (!m) {
    throw new Error(`Unexpected Windows TEMP path: ${raw}`);
  }
  const drive = m[1].toLowerCase();
  const rest = m[2].replace(/\\/g, "/");
  cachedWinTempWsl = `/mnt/${drive}/${rest}`;
  return cachedWinTempWsl;
}

async function synthesizeToFile(
  text: string,
  language: "en" | "ur"
): Promise<string> {
  const voice = VOICES[language];

  const speechText =
    language === "ur" ? await toUrduScript(text) : text;

  console.log("[TTS] Speech text (post-conversion):", speechText);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  const winTempWsl = getWindowsTempDirAsWsl();
  const outputDir = path.join(winTempWsl, `nexus-tts-${randomUUID()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  await tts.toFile(outputDir, speechText);

  return path.join(outputDir, "audio.mp3");
}

// ---- Persistent PowerShell player (avoids per-call process spawn + WPF reload) ----

type PlayerProcess = ChildProcessByStdio<Writable, Readable, null>;

let playerProcess: PlayerProcess | null = null;
let playbackResolvers: Array<() => void> = [];

function startPersistentPlayer(): void {
  const script = `
Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
while ($true) {
  $path = [Console]::In.ReadLine()
  if ($path -eq $null) { break }
  $player.Open([Uri]::new($path))
  Start-Sleep -Milliseconds 100
  $player.Play()
  while ($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 50 }
  Start-Sleep -Seconds $player.NaturalDuration.TimeSpan.TotalSeconds
  $player.Stop()
  Write-Output "DONE"
}
`.trim();

  playerProcess = spawn(
    "powershell.exe",
    ["-NoProfile", "-STA", "-Command", script],
    { stdio: ["pipe", "pipe", "inherit"] }
  );

  playerProcess.stdout.on("data", (data: Buffer) => {
    if (data.toString().includes("DONE")) {
      const resolve = playbackResolvers.shift();
      if (resolve) resolve();
    }
  });

  playerProcess.once("exit", () => {
    // If PowerShell dies unexpectedly, drop the reference so the
    // next playAudioFile call restarts it instead of writing to a
    // dead pipe.
    playerProcess = null;
  });
}

function ensurePlayerRunning(): PlayerProcess {
  if (!playerProcess) {
    startPersistentPlayer();
  }
  return playerProcess!;
}

function playAudioFile(filePath: string): Promise<void> {
  const windowsPath = convertWslPathToWindows(filePath);
  console.log("[TTS] Windows path for playback:", windowsPath);

  const proc = ensurePlayerRunning();

  return new Promise((resolve) => {
    playbackResolvers.push(resolve);
    proc.stdin.write(windowsPath + "\n");
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