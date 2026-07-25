import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";
import { routeCommand } from "../../brain/command-router";

import { commandRecorder } from "../../services/command-recorder.service";
import { speechRecognizerService } from "../../services/speech-recognizer";

export class VoiceCommand implements ICommand {
  readonly name = "voice";

  readonly description =
    "Handles voice input using microphone and Whisper speech recognition.";

  readonly plannerHints = [
    "start listening",
    "listen to voice",
    "record voice",
    "transcribe voice",
    "convert speech to text",
  ];

  readonly parameters = [
    {
      name: "action",
      type: "string",
      required: true,
      description:
        "Voice action. Supported actions: listen.",
    },
  ] as const;

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    try {
      const payload = context.payload as {
        action?: string;
      } | undefined;

      const action = payload?.action?.toLowerCase();

      if (action === "listen") {
        // Manual voice trigger — records one command from the SAME
        // shared microphone stream used by the wake-word pipeline
        // (no second ffmpeg process, no conflicts).
        const audioFilePath = await commandRecorder.record();
        const text = await speechRecognizerService.transcribe(audioFilePath);

        console.log("[Voice] Listening transcript:", text);

        if (!text?.trim()) {
          return {
            success: false,
            error: "EMPTY_TRANSCRIPT",
          };
        }

        return routeCommand("brain", {
          text,
          source: "voice",
        });
      }

      return {
        success: false,
        error: "INVALID_VOICE_ACTION",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "VOICE_FAILED",
      };
    }
  }
}