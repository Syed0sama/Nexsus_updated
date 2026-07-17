import fs from "fs/promises";
import path from "path";

const MEMORY_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(MEMORY_DIR, "user-memory.json");

export class UserMemory {
  async get(): Promise<Record<string, string>> {
    try {
      const data = await fs.readFile(MEMORY_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async set(key: string, value: string): Promise<void> 
  {
    console.log("Saving:", key, value);
    const memory = await this.get();

    memory[key] = value;

    await fs.mkdir(MEMORY_DIR, {
      recursive: true,
    });

    await fs.writeFile(
      MEMORY_FILE,
      JSON.stringify(memory, null, 2),
      "utf-8"
    );
  }
}

export const userMemory = new UserMemory();