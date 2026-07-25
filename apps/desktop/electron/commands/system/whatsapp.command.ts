import { whatsAppService } from "../../services/whatsapp.service";
import { whatsappPending } from "./whatsapp-pending";

import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";


export class WhatsAppCommand implements ICommand {

  readonly name = "whatsapp";

  readonly description =
    "Open WhatsApp Desktop, send WhatsApp messages, or start a WhatsApp voice/video call.";

  readonly parameters = [
    {
      name: "contact",
      type: "string" as const,
      description: "WhatsApp contact name",
      required: false,
    },
    {
      name: "message",
      type: "string" as const,
      description: "Message text to send",
      required: false,
    },
    {
      name: "call",
      type: "boolean" as const,
      description: "Set to true to start a call with the contact instead of sending a message",
      required: false,
    },
    {
      name: "video",
      type: "boolean" as const,
      description: "When call=true, set video=true for a video call instead of a voice call. Ignored unless call=true.",
      required: false,
    },
  ];

  readonly plannerHints = [
    "ONLY use this tool when the user's request explicitly mentions 'WhatsApp' by name.",
    "Use for requests like: 'open whatsapp'.",
    "Use for requests like: 'send whatsapp message to <contact> saying <message>'.",
    "Use for requests like: 'call <contact> on whatsapp' or 'whatsapp call <contact>' -- set call=true and contact=<contact>, do NOT set message.",
    "Use for requests like: 'video call <contact> on whatsapp' or 'whatsapp video call <contact>' -- set call=true, video=true and contact=<contact>, do NOT set message.",
    "Do NOT use this tool for search requests, YouTube requests, or any request that doesn't explicitly say 'WhatsApp'.",
    "Extract contact and message from user request only when 'WhatsApp' is explicitly mentioned.",
  ];

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {

    const payload = context.payload as {
      contact?: string;
      message?: string;
      call?: boolean;
      video?: boolean;
    };

    console.log("WHATSAPP COMMAND PAYLOAD:", payload);

    // voice / video call
    if (payload.call && payload.contact) {
      await whatsAppService.call(payload.contact, payload.video === true);

      return {
        success: true,
        type: "whatsapp",
        data: {
          contact: payload.contact,
          status: payload.video === true ? "video-calling" : "calling",
        },
      };
    }

    // Type the message but do NOT send it yet. A spoken review/
    // confirmation step (handled in voice-pipeline.ts via
    // whatsapp-confirmation.ts) decides when it actually gets sent.
    if (payload.contact && payload.message) {
      await whatsAppService.typeMessage(payload.contact, payload.message, false);

      whatsappPending.set({
        contact: payload.contact,
        message: payload.message,
        stage: "awaiting-review",
      });

      return {
        success: true,
        type: "whatsapp",
        data: {
          contact: payload.contact,
          message: payload.message,
          status: "typed-awaiting-review",
        },
      };
    }

    // open whatsapp only
    await whatsAppService.open();

    return {
      success: true,
      type: "whatsapp",
      data: {
        status: "opened",
      },
    };
  }
}