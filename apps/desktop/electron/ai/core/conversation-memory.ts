import { memoryStore } from "../memory/memory-store";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class ConversationMemory {
  private readonly messages: ConversationMessage[] = [];

  async initialize(): Promise<void> {
    const history = await memoryStore.load();

    this.messages.length = 0;
    this.messages.push(...history);
  }

  async add(message: ConversationMessage): Promise<void> {
    this.messages.push(message);

    await memoryStore.save(this.messages);
  }

  all(): ConversationMessage[] {
    return [...this.messages];
  }

  async clear(): Promise<void> {
    this.messages.length = 0;

    await memoryStore.save([]);
  }

  size(): number {
    return this.messages.length;
  }
}

export const conversationMemory = new ConversationMemory();