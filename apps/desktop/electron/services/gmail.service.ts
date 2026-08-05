import { google } from "googleapis";
import { getGoogleClient } from "./google-auth.service";

export interface EmailSummary {
  subject: string;
  from: string;
}

export interface InboxSnapshot {
  unreadCount: number;
  recentEmails: EmailSummary[];
}

function cleanFromHeader(rawFrom: string): string {
  return rawFrom.replace(/<.*?>/, "").trim().replace(/^"|"$/g, "");
}

/**
 * Fetches the unread count and a summary (subject + sender) of the
 * most recent N emails in the inbox. Used for "check my email" /
 * "how many unread emails" type requests.
 */
export async function getInboxSnapshot(recentCount: number = 5): Promise<InboxSnapshot> {
  const auth = await getGoogleClient();
  const gmail = google.gmail({ version: "v1", auth });

  // Unread count: Gmail gives an approximate total via resultSizeEstimate
  // when we just ask for unread message IDs (cheap, no per-message fetch).
  const unreadList = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["UNREAD", "INBOX"],
    maxResults: 1, // we only need the estimate, not the actual messages
  });
  const unreadCount = unreadList.data.resultSizeEstimate ?? 0;

  // Recent emails: most recent N in the inbox regardless of read state.
  const recentList = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults: recentCount,
  });

  const messageIds = recentList.data.messages?.map((m) => m.id!) ?? [];

  const recentEmails = await Promise.all(
    messageIds.map(async (id) => {
      const message = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["Subject", "From"],
      });

      const headers = message.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(No subject)";
      const rawFrom = headers.find((h) => h.name === "From")?.value ?? "Unknown sender";

      return { subject, from: cleanFromHeader(rawFrom) };
    })
  );

  return { unreadCount, recentEmails };
}