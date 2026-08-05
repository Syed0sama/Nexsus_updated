import { google } from "googleapis";
import { getGoogleClient } from "./google-auth.service";

export type CalendarRangeType =
  | "today"
  | "this-month"
  | "previous-month"
  | "month";

export interface CalendarRangeRequest {
  type: CalendarRangeType;
  // Only used when type === "month". 1-12 (January = 1).
  month?: number;
  // Only used when type === "month". Defaults to current year if omitted.
  year?: number;
}

interface SimpleEvent {
  summary: string;
  start: string;
}

function getRangeDates(request: CalendarRangeRequest): { timeMin: Date; timeMax: Date } {
  const now = new Date();

  if (request.type === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { timeMin: start, timeMax: end };
  }

  if (request.type === "this-month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { timeMin: start, timeMax: end };
  }

  if (request.type === "previous-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { timeMin: start, timeMax: end };
  }

  // "month" -- any named month, defaulting to the current year if not given.
  // JS Date months are 0-indexed, but we take 1-12 from the caller.
  const year = request.year ?? now.getFullYear();
  const monthIndex = (request.month ?? now.getMonth() + 1) - 1;

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  return { timeMin: start, timeMax: end };
}

export async function getCalendarEvents(request: CalendarRangeRequest): Promise<SimpleEvent[]> {
  const auth = await getGoogleClient();
  const calendar = google.calendar({ version: "v3", auth });

  const { timeMin, timeMax } = getRangeDates(request);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = res.data.items ?? [];

  return items.map((event) => ({
    summary: event.summary ?? "(No title)",
    start: event.start?.dateTime ?? event.start?.date ?? "",
  }));
}