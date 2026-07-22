import { audioCaptureService } from "./audio-capture.service";
import { speechRecognizerService } from "./speech-recognizer";

export class VoiceService {
  async startRecording(): Promise<void> {
    audioCaptureService.start();
    console.log("[Voice] Recording started");
  }

async stopRecording(): Promise<string> {
  console.log("[Voice] Stopping recording...");

  const audioFile = await audioCaptureService.stop();

  console.log("[Voice] Transcribing...");
  console.time("[Timing] Whisper transcription");

  const text = await speechRecognizerService.transcribe(audioFile);

  console.timeEnd("[Timing] Whisper transcription");
  console.log("[Voice] Transcript:", text);

  return text.trim();
}
  async listen(): Promise<string> {
  await this.startRecording();

  console.log("[Voice] Listening...");

  await new Promise((resolve) =>
    setTimeout(resolve, 10000)
  );

  const text =
    await this.stopRecording();

  console.log("[Voice] Listen result:", text);

  return text;
}
  isRecording(): boolean {
    return audioCaptureService.isRecording();
  }
}

export const voiceService = new VoiceService();