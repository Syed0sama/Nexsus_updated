import { provider } from "../provider";
import { userMemory } from "./user-memory";

/**
 * Extracts durable, reusable facts about the user from a single
 * conversation exchange (one user message + the assistant's reply),
 * and stores them in userMemory.
 *
 * Intentionally conservative: only stable facts (preferences, identity,
 * relationships, tool choices) should be captured -- NOT one-off task
 * details ("send hello to Ali") which belong to conversation history,
 * not long-term memory.
 *
 * This function is safe to call without awaiting (fire-and-forget).
 * It never throws -- any failure is logged and swallowed so it can
 * never break or slow down the main chat/command flow.
 */
interface ExtractedFacts {
  [key: string]: string;
}

function buildExtractionPrompt(
  userMessage: string,
  assistantMessage: string
): string {
  return `
You extract durable facts about the USER from a conversation exchange,
for a personal assistant's long-term memory.

Only extract facts that are:
- Stable / long-term (preferences, identity, relationships, default tools/apps)
- Explicitly stated or clearly implied by the user

Do NOT extract:
- One-off task details ("send a message to X", "open Y right now")
- Anything uncertain or guessed
- Anything the assistant said, unless the user confirmed it

Return ONLY a valid JSON object.

Rules:
- Return a flat JSON object only.
- Keys MUST be enclosed in double quotes.
- Values MUST be enclosed in double quotes.
- Do NOT use markdown.
- Do NOT use code fences.
- Do NOT return YAML.
- Do NOT return key:value pairs.
- Do NOT include explanations.
- If there is nothing worth remembering, return exactly:
{}

User message:
${userMessage}

Assistant reply:
${assistantMessage}
`.trim();
}

function safeParseFacts(raw: string): ExtractedFacts {
  try {
    raw = raw.trim();
    raw = raw.replace(/```json|```/gi, "").trim();
    const objectMatch = raw.match(/{[\s\S]*}/);

    if (objectMatch) {
      raw = objectMatch[0];
    }
    raw = raw.replace(
  /([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g,
  '$1"$2":'
);

    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      const facts: ExtractedFacts = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (typeof key === "string" && typeof value === "string") {
          facts[key] = value;
        }
      }

      return facts;
    }

    return {};
  } catch {
    return {};
  }
}

export class MemoryExtractor {
  async extract(
    userMessage: string,
    assistantMessage: string
  ): Promise<void> {
    console.log("[MemoryExtractor] extract() called");

    try {
      if (!userMessage?.trim() || !assistantMessage?.trim()) {
        return;
      }

      const prompt = buildExtractionPrompt(
        userMessage,
        assistantMessage
      );
      console.log("[MemoryExtractor] Calling Ollama...");
      const response = await provider.chat(prompt);
      console.log("[MemoryExtractor] Raw AI response:");
console.log(response);
      const facts = safeParseFacts(response);

      const entries = Object.entries(facts);

      if (entries.length === 0) {
        return;
      }

      for (const [key, value] of entries) {
        await userMemory.set(key, value);
      }

      console.log(
        "[MemoryExtractor] Stored facts:",
        facts
      );
    } catch (error) {
      console.warn(
        "[MemoryExtractor] Extraction failed (ignored):",
        error
      );
    }
  }
}

export const memoryExtractor = new MemoryExtractor();