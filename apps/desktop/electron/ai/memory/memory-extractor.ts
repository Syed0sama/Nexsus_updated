import { provider } from "../provider";
import { userMemory } from "./user-memory";
import { memoryManager } from "./memory-manager";
import { memoryValidator } from "./memory-validator";

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

The user may write in English or Roman Urdu (Urdu written in Latin
letters, e.g. "meri ammi ka naam Saira hai").

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

CRITICAL — Choosing the correct key:
Pay close attention to WHOSE name or fact is being stated. Never default
to a generic key like "name" or "user_name" if the sentence is about
someone else (mother, father, wife, husband, sibling, friend, etc).

Use these exact keys when the sentence matches:
- The USER's own name          -> "name"
- The user's mother's name     -> "mother_name"   (ammi, ami, maa, walida)
- The user's father's name     -> "father_name"   (abbu, abba, baap, walid)
- The user's wife's name       -> "wife_name"     (biwi, begum)
- The user's husband's name    -> "husband_name"  (shohar)
- The user's sibling's name    -> "sibling_name"  (bhai, behn)
- The user's friend's name     -> "friend_name"   (dost)
- A favorite/preference        -> "favorite_<thing>" (e.g. favorite_car, favorite_color, favorite_food)
- A default tool/app/browser   -> "default_<thing>" (e.g. default_browser)

If the sentence is about the user's mother, the key is ALWAYS
"mother_name" — never "name" or "user_name", even if the sentence
also happens to mention what her name IS to the user. The subject of
the sentence (whose name is this?) determines the key, not the fact
that a name is being given.

Examples:

User:
my favourite car is bugatti

Output:
{
  "favorite_car": "bugatti"
}

User:
meri ammi ka naam Saira hai

Output:
{
  "mother_name": "Saira"
}

User:
mera naam Osama hai

Output:
{
  "name": "Osama"
}

User:
meri biwi ka naam Tayiba hai

Output:
{
  "wife_name": "Tayiba"
}

User:
mere abbu ka naam Tahir hai

Output:
{
  "father_name": "Tahir"
}

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
  const validation = memoryValidator.validate(
    key,
    value
  );

  if (!validation.allowed) {
    console.log(
      "[MemoryExtractor] Blocked memory:",
      key,
      validation.reason
    );
    continue;
  }

  await userMemory.set(key, value);

  await memoryManager.add({
    key,
    value,
    type: validation.type,
    scope: "long_term",
    confidence: validation.confidence,
    source: "memory_extractor",
  });
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