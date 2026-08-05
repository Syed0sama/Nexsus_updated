import { getCalendarEvents } from "../../services/calendar.service";
import type { CalendarRangeRequest } from "../../services/calendar.service";
import type { ICommand, CommandContext, CommandResult } from "../types";

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export class CalendarCommand implements ICommand {
  readonly name = "calendar";

  readonly description =
    "Check Google Calendar for events today, this month, the previous month, or any specific named month (e.g. August, December).";

  readonly parameters = [
    {
      name: "range",
      type: "string" as const,
      description:
        "One of: 'today', 'this-month', 'previous-month', or a month name like 'august', 'december', 'march', etc.",
      required: true,
    },
    {
      name: "year",
      type: "number" as const,
      description:
        "Only used when range is a month name. The year for that month, e.g. 2026. Defaults to the current year if not specified.",
      required: false,
    },
  ];

  readonly plannerHints = [
    "ONLY use this tool when the user asks about their calendar, schedule, or events.",
    "Use for: 'do I have any events today' or 'anything on my calendar today' -> range='today'.",
    "Use for: 'any events this month' -> range='this-month'.",
    "Use for: 'was there anything last month' or 'previous month events' -> range='previous-month'.",
    "Use for: 'anything in August', 'do I have events in December', 'events in March 2027' -> range='<month name>' (e.g. range='august'), and set year only if the user mentions one.",
    "Default to range='today' if the user doesn't specify a time period.",
  ];

  async execute(context: CommandContext): Promise<CommandResult> {
    const payload = context.payload as { range?: string; year?: number };
    const rawRange = (payload.range ?? "today").toLowerCase().trim();

    let request: CalendarRangeRequest;

    if (rawRange === "today" || rawRange === "this-month" || rawRange === "previous-month") {
      request = { type: rawRange };
    } else {
      const monthIndex = MONTH_NAMES.indexOf(rawRange);
      if (monthIndex === -1) {
        // Unknown range string -- fall back to today rather than guessing.
        request = { type: "today" };
      } else {
        request = { type: "month", month: monthIndex + 1, year: payload.year };
      }
    }

    try {
      const events = await getCalendarEvents(request);

      return {
        success: true,
        type: "calendar",
        data: { range: rawRange, events },
      };
    } catch (err) {
      console.error("CALENDAR COMMAND ERROR:", err);
      return {
        success: false,
        type: "calendar",
        error: "CALENDAR_FETCH_FAILED",
      };
    }
  }
}