import { randomUUID } from "node:crypto";
import {
  MemoryEntry,
  MemoryScope,
  MemorySearchResult,
  MemoryType,
} from "./memory-types";
import { memoryV2Store } from "./memory-v2-store";
import { memoryScoring } from "./memory-scoring";
import { embedText, cosineSimilarity, EMBED_MODEL } from "../provider/embedding";

export class MemoryManager {
  private memories: MemoryEntry[] = [];
  private loaded = false;

  async initialize(): Promise<void> {
    if (this.loaded) return;

    this.memories = await memoryV2Store.load();
    this.loaded = true;
  }

  async add(params: {
    type: MemoryType;
    scope: MemoryScope;
    key: string;
    value: string;
    confidence?: number;
    importance?: number;
    tags?: string[];
    source?: string;
  }): Promise<MemoryEntry> {
    await this.initialize();

    const now = new Date().toISOString();
    const existing = this.memories.find(
      (m) => m.key.toLowerCase() === params.key.toLowerCase()
    );

    const score = memoryScoring.score(
      params.type,
      existing ? 2 : 1
    );

    // Natural sentence for embedding — gives the model real meaning
    // instead of raw key/value fragments.
    const naturalText = `${params.key.replace(/_/g, " ")}: ${params.value}`;
    const embedding = await embedText(naturalText);

    const memory: MemoryEntry = {
      id: randomUUID(),
      type: params.type,
      scope: params.scope,
      key: params.key,
      value: params.value,
      confidence: params.confidence ?? score.confidence,
      importance: params.importance ?? score.importance,
      embedding,
      embeddingModel: EMBED_MODEL,
      metadata: {
        source: params.source,
        tags: params.tags ?? [],
        createdAt: now,
        updatedAt: now,
      },
    };

    const existingIndex = this.memories.findIndex(
      (item) => item.key.toLowerCase() === memory.key.toLowerCase()
    );

    if (existingIndex !== -1) {
      const existingEntry = this.memories[existingIndex];

      const updated: MemoryEntry = {
        ...existingEntry,
        value: memory.value,
        type: memory.type,
        confidence: memory.confidence,
        importance: memory.importance,
        embedding: memory.embedding,
        embeddingModel: memory.embeddingModel,
        metadata: {
          ...existingEntry.metadata,
          updatedAt: now,
          source: memory.metadata.source,
        },
      };

      this.memories[existingIndex] = updated;
      await memoryV2Store.save(this.memories);
      return updated;
    }

    this.memories.push(memory);
    await memoryV2Store.save(this.memories);
    return memory;
  }

  async getAll(): Promise<MemoryEntry[]> {
    await this.initialize();
    return [...this.memories];
  }

  async findByKey(key: string): Promise<MemoryEntry | undefined> {
    await this.initialize();

    return this.memories.find(
      (m) => m.key.toLowerCase() === key.toLowerCase()
    );
  }

  /**
   * Ranks all memories by semantic similarity to the query embedding.
   * No keyword matching, no unconditional type bonuses — a memory
   * only scores based on how close it actually is to the query.
   * Memories embedded with a different/stale embedding model are
   * excluded, since their vectors live in an incompatible space.
   */
  async searchByEmbedding(
    queryEmbedding: number[]
  ): Promise<MemorySearchResult[]> {
    await this.initialize();

    return this.memories
      .filter(
        (m) =>
          Array.isArray(m.embedding) &&
          m.embedding.length > 0 &&
          m.embeddingModel === EMBED_MODEL
      )
      .map((memory) => ({
        memory,
        score: cosineSimilarity(queryEmbedding, memory.embedding!),
      }))
      .sort((a, b) => b.score - a.score);
  }

  async replaceAll(memories: MemoryEntry[]): Promise<void> {
    await this.initialize();

    this.memories = [...memories];

    await memoryV2Store.save(this.memories);
  }

  async clear(): Promise<void> {
    this.memories = [];
    await memoryV2Store.save([]);
  }
}

export const memoryManager = new MemoryManager();