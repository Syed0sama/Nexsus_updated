import fs from "fs/promises";
import path from "path";

import type { MemoryEntry } from "./memory-types";

const MEMORY_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(MEMORY_DIR, "memory-v2.json");

export class MemoryV2Store {
  async load(): Promise<MemoryEntry[]> {
    try {
      const data = await fs.readFile(MEMORY_FILE, "utf-8");
      return JSON.parse(data) as MemoryEntry[];
    } catch {
      return [];
    }
  }

  async save(memories: MemoryEntry[]): Promise<void> {
    await fs.mkdir(MEMORY_DIR, {
      recursive: true,
    });

    await fs.writeFile(
      MEMORY_FILE,
      JSON.stringify(memories, null, 2),
      "utf-8"
    );
  }
}

export const memoryV2Store = new MemoryV2Store();