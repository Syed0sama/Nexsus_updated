export type MemoryScope = "short_term" | "long_term";

export type MemoryType =
  | "fact"
  | "preference"
  | "profile"
  | "relationship"
  | "alias"
  | "task"
  | "context";

export interface MemoryMetadata {
  source?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  scope: MemoryScope;

  key: string;
  value: string;

  confidence: number;
  importance: number;

  embedding?: number[];
  embeddingModel?: string;   // <-- NAYI LINE

  metadata: MemoryMetadata;
}
export interface MemorySearchResult {
  memory: MemoryEntry;
  score: number;
}