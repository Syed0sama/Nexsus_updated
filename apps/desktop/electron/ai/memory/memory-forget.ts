import { memoryManager } from "./memory-manager";

export class MemoryForget {
  async forgetByKey(key: string): Promise<boolean> {
    const memories = await memoryManager.getAll();

    const filtered = memories.filter(
      (m) => m.key.toLowerCase() !== key.toLowerCase()
    );

    if (filtered.length === memories.length) {
      return false;
    }

    await memoryManager.replaceAll(filtered);

    return true;
  }

  async forgetAll(): Promise<void> {
    await memoryManager.clear();
  }
}

export const memoryForget = new MemoryForget();