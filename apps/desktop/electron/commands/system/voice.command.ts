import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";
import { routeCommand } from "../../brain/command-router";

import { voiceService } from "../../services/voice.service";

export class VoiceCommand implements ICommand {
  readonly name = "voice";

  readonly description =
"Handles voice input using microphone and Whisper speech recognition.";

 readonly plannerHints = [
  "start listening",
  "start microphone",
  "activate microphone",
  "listen to voice",
  "record voice",
  "stop listening",
  "stop microphone",
  "transcribe voice",
  "convert speech to text",
];

  readonly parameters = [
    {
      name: "action",
      type: "string",
      required: true,
      description:
"Voice action. Supported actions: listen, start or stop.",
    },
  ] as const;


  async execute(
    context: CommandContext
  ): Promise<CommandResult> {

    try {

      const payload = context.payload as {
        action?: string;
      } | undefined;


      const action =
        payload?.action?.toLowerCase();


      if (action === "start") {

        await voiceService.startRecording();

        return {
          success: true,
          type: "voice",
          data: {
            status: "recording_started",
          },
        };
      }

      if (action === "listen") {
  const text = await voiceService.listen();

  console.log("[Voice] Listening transcript:", text);

  if (!text) {
    return {
      success: false,
      error: "EMPTY_TRANSCRIPT",
    };
  }

  return routeCommand("brain", {
    text,
    source: "voice",   // <-- YE ADD KARO
  });
}

if (action === "stop") {
  const text = await voiceService.stopRecording();

  console.log("[Voice] Sending transcript to brain:", text);

  if (!text) {
    return {
      success: false,
      error: "EMPTY_TRANSCRIPT",
    };
  }

  return routeCommand("brain", {
    text,
    source: "voice",   // <-- YE ADD KARO
  });
}


      return {
        success: false,
        error:
          "INVALID_VOICE_ACTION",
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