import fs from "fs/promises";
import path from "path";

import type { MemoryEntry } from "./memory-types";

const MEMORY_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(MEMORY_DIR, "user-memory.json");

type LegacyMemory = Record<string, string>;

export class UserMemory {
  async get(): Promise<LegacyMemory> {
    try {
      const data = await fs.readFile(MEMORY_FILE, "utf-8");
      const parsed = JSON.parse(data);

      if (parsed.memories) {
        const legacy: LegacyMemory = {};

        for (const memory of parsed.memories as MemoryEntry[]) {
          legacy[memory.key] = memory.value;
        }

        return legacy;
      }

      return parsed;
    } catch {
      return {};
    }
  }

  async getEntries(): Promise<MemoryEntry[]> {
    try {
      const data = await fs.readFile(MEMORY_FILE, "utf-8");
      const parsed = JSON.parse(data);

      return parsed.memories ?? [];
    } catch {
      return [];
    }
  }

  async set(key: string, value: string): Promise<void> {
    const memory = await this.get();

    memory[key] = value;

    await this.saveLegacy(memory);
  }

  async saveEntries(entries: MemoryEntry[]): Promise<void> {
    const legacy = await this.get();

    await fs.mkdir(MEMORY_DIR, {
      recursive: true,
    });

    await fs.writeFile(
      MEMORY_FILE,
      JSON.stringify(
        {
          ...legacy,
          memories: entries,
        },
        null,
        2
      ),
      "utf-8"
    );
  }

  private async saveLegacy(memory: LegacyMemory): Promise<void> {
    const entries = await this.getEntries();

    await fs.mkdir(MEMORY_DIR, {
      recursive: true,
    });

    await fs.writeFile(
      MEMORY_FILE,
      JSON.stringify(
        {
          ...memory,
          memories: entries,
        },
        null,
        2
      ),
      "utf-8"
    );
  }
}

export const userMemory = new UserMemory();