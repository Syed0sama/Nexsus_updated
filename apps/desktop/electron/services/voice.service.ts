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

    const text = await speechRecognizerService.transcribe(audioFile);

    console.log("[Voice] Transcript:", text);

    return text.trim();
  }

  isRecording(): boolean {
    return audioCaptureService.isRecording();
  }
}

export const voiceService = new VoiceService();