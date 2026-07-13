import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import { openApplication } from "../../services/open-app.service";

interface OpenAppPayload {
  app: string;
  url?: string;
}

export class OpenAppCommand implements ICommand {
  readonly name = "openApp";

 readonly description =
  "Opens a Windows desktop application. If a URL is supplied, the application opens that URL.";

  readonly parameters = [
    {
      name: "app",
      type: "string",
      required: true,
      description: "Registered application identifier or alias."
    },
    {
      name: "url",
      type: "string",
      required: false,
     description:"Optional HTTPS URL. When provided, the application should open this URL.",

    },
  ] as const;

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    const payload =
      context.payload as Partial<OpenAppPayload>;

    const app = payload.app?.trim();

    if (!app) {
      return {
        success: false,
        error: "APP_NAME_REQUIRED",
      };
    }

    try {
      await openApplication(app, payload.url);

      return {
        success: true,
        data: {
          app,
          url: payload.url ?? null,
          status: "opened",
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "FAILED_TO_OPEN_APP",
      };
    }
  }
}