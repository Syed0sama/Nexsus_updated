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
    "Records microphone input and converts speech to text using Whisper.";

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
        "Voice action. Supported actions: start or stop.",
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


      if (action === "stop") {

  const text =
    await voiceService.stopRecording();

  console.log("[Voice] Sending transcript to brain:", text);


  if (!text) {
    return {
      success: false,
      error: "EMPTY_TRANSCRIPT",
    };
  }


  return routeCommand(
    "brain",
    {
      text,
    }
  );
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