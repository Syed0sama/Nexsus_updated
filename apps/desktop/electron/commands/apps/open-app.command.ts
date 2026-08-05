import {
  ICommand,
  CommandContext,
  CommandResult,
} from "../types";

import { openApplication } from "../../services/open-app.service";

interface OpenAppPayload {
  target: string;
  url?: string;
}

export class OpenAppCommand implements ICommand {
  readonly name = "openApp";

  readonly description =
    "Opens an application, folder, file, or website.";
  
readonly plannerHints = [
  "Use this tool to open websites through Chrome using HTTPS URLs.",
  "Website requests should use target='chrome' and provide a complete HTTPS url.",
"YouTube SEARCH requests (not play requests) should open Chrome with a YouTube search URL -- use this ONLY when the user wants to see search results, not play a video directly.",
  "If the user says 'play' a video on YouTube, do NOT use this tool -- use the youtubePlay tool instead.",
  "Example: Search 'belki' on YouTube means target='chrome' and url='https://www.youtube.com/search?q=belki'.",

  // Maps / location / directions — cover multiple phrasings
  "Any request to open, show, find, or locate a place on maps uses target='chrome' with a Google Maps URL.",
  "This includes phrasings like 'open location for X', 'show me X on maps', 'find X location', 'directions to X', 'route to X', 'take me to X', 'my location to X'.",
  "If the user only names a place (no explicit origin), use the search URL format: https://www.google.com/maps/search/?api=1&query=<PLACE_URL_ENCODED>",
  "If the user explicitly asks for directions/route from one place to another, use the directions URL format: https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=<DESTINATION_URL_ENCODED>",
  "Example: 'open location for Bahria Town Phase 8' means target='chrome' and url='https://www.google.com/maps/search/?api=1&query=Bahria+Town+Phase+8'.",
  "Example: 'meri location se saddar dikhao maps pe' means target='chrome' and url='https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=Saddar'.",
  "If the user gives both origin and destination explicitly, replace 'Current Location' with the given origin, URL-encoded.",
];

  readonly parameters = [
    {
      name: "target",
      type: "string",
      required: true,
      description:
        "Application, folder, file, or other resource to open.",
    },
    {
      name: "url",
      type: "string",
      required: false,
      description:
        "Optional HTTPS URL to open with the target application.",
    },
  ] as const;

  async execute(
    context: CommandContext
  ): Promise<CommandResult> {
    const payload =
      context.payload as Partial<OpenAppPayload>;

    const target = payload.target?.trim();

    if (!target) {
      return {
        success: false,
        error: "TARGET_REQUIRED",
      };
    }

    try {
      await openApplication(target, payload.url);

      return {
        success: true,
        data: {
          target,
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
            : "FAILED_TO_OPEN_RESOURCE",
      };
    }
  }
}