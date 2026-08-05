// electron/ai/memory/memory-retriever.ts

import { memoryManager } from "./memory-manager";
import { embedText } from "../provider/embedding";
import { ollamaProvider } from "../provider/ollama";
import type { MemoryEntry } from "./memory-types";

const ABSOLUTE_FLOOR = 0.4;
const HIGH_CONFIDENCE_THRESHOLD = 0.65;
const MAX_CANDIDATES_TO_CHECK = 2;

export class MemoryRetriever {
  async retrieve(query: string): Promise<MemoryEntry | null> {
    const queryEmbedding = await embedText(query);
    const results = await memoryManager.searchByEmbedding(queryEmbedding);

    console.log(
      "[MemoryRetriever] All scores:",
      results.map((r) => `${r.memory.key}=${r.score.toFixed(3)}`)
    );

    if (results.length === 0) {
      console.log("[MemoryRetriever] No results at all.");
      return null;
    }
    if (results[0].score >= HIGH_CONFIDENCE_THRESHOLD) {
  console.log(
    `[MemoryRetriever] High confidence (${results[0].score.toFixed(3)}), skipping validation.`
  );
  return results[0].memory;
}

    const candidates = results
      .filter((r) => r.score >= ABSOLUTE_FLOOR)
      .slice(0, MAX_CANDIDATES_TO_CHECK);

    console.log(
      "[MemoryRetriever] Candidates above floor:",
      candidates.map((c) => `${c.memory.key}=${c.score.toFixed(3)}`)
    );

    if (candidates.length === 0) {
      console.log("[MemoryRetriever] Nothing cleared the floor.");
      return null;
    }

    for (const candidate of candidates) {
      const isValid = await this.validateMatch(query, candidate.memory);
      console.log(
        `[MemoryRetriever] Validated "${candidate.memory.key}":`,
        isValid
      );

      if (isValid) {
        return candidate.memory;
      }
    }

    console.log("[MemoryRetriever] No candidate passed validation.");
    return null;
  }

  // memory-retriever.ts, validateMatch() ke andar
private async validateMatch(
  query: string,
  memory: MemoryEntry
): Promise<boolean> {
  const prompt = `You are validating a memory lookup.

The stored fact has a key and a value. Some keys are about the user's OWN
information (e.g. name, age, city, job, favorite color) — for these, no
relation word is needed in the request; a direct match on the topic (e.g.
"what is my name" -> key "name") is enough.

Other keys are about a RELATED PERSON (e.g. wife_name, mother_name,
father_name, friend_name) — for these, the request must mention the
matching relation word. Common Roman Urdu relation words and their meaning:
ammi/ami/amma = mother, abbu/abba/walid = father, biwi/bivi/bivii = wife,
shohar/khawand = husband, behen/bahen = sister, bhai = brother.

User's request (this may be phrased as a question, or as a command asking
for information — e.g. "batao" / "bata do" mean "tell me" and should be
treated the same as a question): "${query}"

Stored fact: ${memory.key} = ${memory.value}

Does this stored fact directly and specifically answer or fulfill what the
user is asking for?
- If the key is about the user's own info (name, age, city, etc.) and the
  request is asking about that same topic, answer "yes".
- If the key is about a related person, the request must reference that
  same relation (directly or via the glossary) — otherwise answer "no".

Reply with ONLY one word: yes or no.`;

  try {
    const answer = await ollamaProvider.chat(prompt);
    console.log(
      `[MemoryRetriever] Raw validation answer for "${memory.key}":`,
      JSON.stringify(answer)
    );
    return answer.trim().toLowerCase().startsWith("yes");
  } catch (error) {
    console.warn(
      "[MemoryRetriever] Validation call failed, accepting match by default:",
      error
    );
    return true;
  }
}
}

export const memoryRetriever = new MemoryRetriever();