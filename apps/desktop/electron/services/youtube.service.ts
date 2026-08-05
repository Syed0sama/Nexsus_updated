import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const KEY_PATH = path.join(__dirname, "../../electron/config/youtube-api-key.json");

function loadApiKey(): string {
  const raw = fs.readFileSync(KEY_PATH, "utf-8");
  return JSON.parse(raw).apiKey;
}

/**
 * Searches YouTube for the given query and returns the URL of the
 * top matching video, or null if nothing was found.
 */
export async function findTopYouTubeVideo(query: string): Promise<string | null> {
  const apiKey = loadApiKey();
  const youtube = google.youtube({ version: "v3", auth: apiKey });

  const res = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    maxResults: 1,
  });

  const videoId = res.data.items?.[0]?.id?.videoId;
  if (!videoId) return null;

  return `https://www.youtube.com/watch?v=${videoId}`;
}