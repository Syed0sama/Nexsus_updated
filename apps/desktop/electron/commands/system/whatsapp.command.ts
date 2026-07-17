import { whatsAppService } from "../../services/whatsapp.service";

import type {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";


export class WhatsAppCommand implements ICommand {

  readonly name = "whatsapp";


  readonly description =
    "Open WhatsApp Desktop or send WhatsApp messages.";


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
      name: "confirm",
      type: "boolean" as const,
      description: "Confirm sending pending WhatsApp message",
      required: false,
    },
  ];


  readonly plannerHints = [
    "Use for requests like: open whatsapp.",
    "Use for requests like: send whatsapp message to someone.",
    "Extract contact and message from user request.",
    "If user confirms with yes, use confirm=true.",
  ];



  async execute(
    context: CommandContext
  ): Promise<CommandResult> {


    const payload = context.payload as {
      contact?: string;
      message?: string;
      confirm?: boolean;
    };



    console.log(
      "WHATSAPP COMMAND PAYLOAD:",
      payload
    );



    // direct send
    if (
      payload.contact &&
      payload.message
    ) {


      await whatsAppService.sendMessage(
        payload.contact,
        payload.message
      );


      return {
        success: true,
        type: "whatsapp",
        data: {
          contact: payload.contact,
          message: payload.message,
          status: "sent",
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