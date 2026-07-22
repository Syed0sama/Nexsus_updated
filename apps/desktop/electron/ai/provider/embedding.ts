// electron/ai/provider/embedding.ts

const OLLAMA_URL = "http://localhost:11434/api/embeddings";
export const EMBED_MODEL = "bge-m3";   // <-- export kiya

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });

  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OllamaEmbeddingResponse;

  if (!Array.isArray(data.embedding)) {
    throw new Error("Embedding response missing 'embedding' array");
  }

  return data.embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vector length mismatch — cannot compute similarity");
  }

  let dot = 0, normA = 0, normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}