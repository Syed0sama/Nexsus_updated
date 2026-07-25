// Records ONE voice command from the shared microphone stream — no
// second ffmpeg process. Subscribes to audioCaptureService only for
// the duration of the recording, stops on silence or a max-duration
// safety timeout, and saves a WAV file for Whisper to transcribe.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { audioCaptureService } from "./audio-capture.service";

const SAMPLE_RATE = 16000;
const SILENCE_RMS_THRESHOLD = 500;
const SILENCE_DURATION_MS = 1500; // thoda barhaya — user pause le sake beech mein bhi
const MAX_RECORDING_MS = 15000;
const INITIAL_GRACE_PERIOD_MS = 2500; // 

function rms(buffer: Buffer): number {
  const samples = buffer.length / 2;
  let sumSquares = 0;
  for (let i = 0; i < samples; i++) {
    const sample = buffer.readInt16LE(i * 2);
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples);
}

function writeWavFile(pcmData: Buffer, filePath: string): void {
  const byteRate = SAMPLE_RATE * 2;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);

  fs.writeFileSync(filePath, Buffer.concat([header, pcmData]));
}

export class CommandRecorder {
  record(): Promise<string> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let silenceStartedAt: number | null = null;
      const recordingStartedAt = Date.now();

      const finish = () => {
        unsubscribe();
        clearInterval(safetyTimer);

        const pcmData = Buffer.concat(chunks);
        const outDir = path.join(os.tmpdir(), `nexus-command-${randomUUID()}`);
        fs.mkdirSync(outDir, { recursive: true });
        const filePath = path.join(outDir, "command.wav");

        writeWavFile(pcmData, filePath);
        resolve(filePath);
      };

      const unsubscribe = audioCaptureService.subscribe((chunk) => {
        chunks.push(chunk);

        const elapsed = Date.now() - recordingStartedAt;

        // Give the user time to start speaking after the greeting —
        // don't count silence against them yet.
        if (elapsed < INITIAL_GRACE_PERIOD_MS) {
          return;
        }

        const level = rms(chunk);

        if (level < SILENCE_RMS_THRESHOLD) {
          if (silenceStartedAt === null) {
            silenceStartedAt = Date.now();
          } else if (Date.now() - silenceStartedAt >= SILENCE_DURATION_MS) {
            finish();
          }
        } else {
          silenceStartedAt = null;
        }
      });

      const safetyTimer = setInterval(() => {
        if (Date.now() - recordingStartedAt >= MAX_RECORDING_MS) {
          finish();
        }
      }, 250);
    });
  }
}

export const commandRecorder = new CommandRecorder();