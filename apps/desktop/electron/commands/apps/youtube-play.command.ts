import { ICommand, CommandContext, CommandResult } from "../types";
import { findTopYouTubeVideo } from "../../services/youtube.service";
import { openApplication } from "../../services/open-app.service";

interface YoutubePlayPayload {
  query: string;
}

export class YoutubePlayCommand implements ICommand {
  readonly name = "youtubePlay";

  readonly description =
    "Searches YouTube for a video and plays the top result directly, instead of just showing search results.";

  readonly parameters = [
    {
      name: "query",
      type: "string",
      required: true,
      description: "What to search for and play on YouTube.",
    },
  ] as const;

  readonly plannerHints = [
    "Use this tool ONLY when the user explicitly wants to PLAY a video on YouTube, not just search for it.",
    "Trigger phrases: 'play X on youtube', 'play X on yt', 'youtube pe X chalao', 'X youtube pe play karo'.",
    "Do NOT use this for 'search X on youtube' or 'find X on youtube' -- those should use the openApp tool with a search URL instead.",
    "Example: 'play believer on youtube' means query='believer'.",
    "Example: 'play the new imagine dragons song on youtube' means query='new imagine dragons song'.",
  ];

  async execute(context: CommandContext): Promise<CommandResult> {
    const payload = context.payload as Partial<YoutubePlayPayload>;
    const query = payload.query?.trim();

    if (!query) {
      return { success: false, error: "QUERY_REQUIRED" };
    }

    try {
      const videoUrl = await findTopYouTubeVideo(query);

      if (!videoUrl) {
        return { success: false, type: "youtubePlay", error: "NO_VIDEO_FOUND" };
      }

      await openApplication("chrome", videoUrl);

      return {
        success: true,
        type: "youtubePlay",
        data: { query, url: videoUrl },
      };
    } catch (error) {
      console.error("YOUTUBE PLAY ERROR:", error);
      return {
        success: false,
        type: "youtubePlay",
        error: error instanceof Error ? error.message : "YOUTUBE_PLAY_FAILED",
      };
    }
  }
}