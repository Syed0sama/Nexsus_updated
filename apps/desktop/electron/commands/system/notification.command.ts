import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import {
  showNotification,
} from "../../services/notification.service";

interface NotificationPayload {
  title: string;
  message: string;
}

export class NotificationCommand
  implements ICommand
{
  readonly name = "notification";

  readonly description =
    "Displays a Windows notification.";

  readonly plannerHints = [
    "show notification",
    "notify me",
    "display notification",
    "send notification",
    "toast notification",
  ];

  readonly parameters = [
    {
      name: "title",
      type: "string",
      required: true,
      description:
        "Notification title.",
    },
    {
      name: "message",
      type: "string",
      required: true,
      description:
        "Notification message.",
    },
  ] as const;

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    const payload =
      context.payload as Partial<NotificationPayload>;

    const title =
      payload.title?.trim();

    const message =
      payload.message?.trim();

    if (!title) {
      return {
        success: false,
        error: "TITLE_REQUIRED",
      };
    }

    if (!message) {
      return {
        success: false,
        error: "MESSAGE_REQUIRED",
      };
    }

    try {
      await showNotification(
        title,
        message
      );

      return {
        success: true,
        data: {
          title,
          message,
          status: "shown",
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "FAILED_TO_SHOW_NOTIFICATION",
      };
    }
  }
}