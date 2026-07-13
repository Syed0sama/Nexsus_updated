import fs from "fs/promises";
import path from "path";

import type { ConversationMessage } from "../core/conversation-memory";

const MEMORY_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(MEMORY_DIR, "conversation.json");

export class MemoryStore {
  async load(): Promise<ConversationMessage[]> {
    try {
      const data = await fs.readFile(MEMORY_FILE, "utf-8");
      return JSON.parse(data) as ConversationMessage[];
    } catch {
      return [];
    }
  }

  async save(messages: ConversationMessage[]): Promise<void> {
    await fs.mkdir(MEMORY_DIR, {
      recursive: true,
    });

    await fs.writeFile(
      MEMORY_FILE,
      JSON.stringify(messages, null, 2),
      "utf-8"
    );
  }
}

export const memoryStore = new MemoryStore();