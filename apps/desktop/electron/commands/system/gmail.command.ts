import { getInboxSnapshot } from "../../services/gmail.service";
import type { ICommand, CommandContext, CommandResult } from "../types";

export class GmailCommand implements ICommand {
  readonly name = "gmail";

  readonly description =
    "Check Gmail inbox: unread email count, or a summary of the most recent emails.";

  readonly parameters = [
    {
      name: "count",
      type: "number" as const,
      description:
        "How many recent emails to summarize. Defaults to 1 for 'latest email' requests, or 5 for general 'check my email' requests.",
      required: false,
    },
  ];

  readonly plannerHints = [
    "ONLY use this tool when the user asks about email, inbox, or unread messages.",
    "Use for: 'did I get any email', 'check my gmail' -> count=1 (just the latest).",
    "Use for: 'how many unread emails do I have', 'any unread mail' -> count=1 (unread count is always included regardless).",
    "Use for: 'read my recent emails', 'summarize my inbox', 'what emails did I get' -> count=5.",
    "Use for: 'what's the subject of my latest email' -> count=1.",
  ];

  async execute(context: CommandContext): Promise<CommandResult> {
    const payload = context.payload as { count?: number };
    const count = payload.count && payload.count > 0 ? payload.count : 1;

    try {
      const snapshot = await getInboxSnapshot(count);

      return {
        success: true,
        type: "gmail",
        data: {
          unreadCount: snapshot.unreadCount,
          recentEmails: snapshot.recentEmails,
        },
      };
    } catch (err) {
      console.error("GMAIL COMMAND ERROR:", err);
      return {
        success: false,
        type: "gmail",
        error: "GMAIL_FETCH_FAILED",
      };
    }
  }
}