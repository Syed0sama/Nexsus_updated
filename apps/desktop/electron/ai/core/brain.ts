import { provider } from "../provider";
import { buildPrompt } from "./prompt-builder";
import { memoryManager } from "../memory/memory-manager";
import { memoryForget } from "../memory/memory-forget";
import { memoryRetriever } from "../memory/memory-retriever";
import { memoryResponder } from "../memory/memory-responder";
import { detectLanguage } from "./language-detector";

/**
 * Lightweight structural check: is this input phrased as a question?
 * This is NOT memory matching (no keyword/content hacks) — it's a
 * routing decision about the input's grammatical form, made before
 * any memory content is touched. Statements should never trigger
 * memory retrieval, since the fact they're describing may not be
 * saved yet (extraction runs async, after this function returns).
 */
/**
 * Converts a stored memory key like "wife_name" or "mother_name" into
 * a natural spoken phrase like "your wife's name" or "your mother's
 * name", instead of the flat "wife name" / "mother name" which sounds
 * robotic when read aloud by TTS.
 */
function keyToNaturalPhrase(key: string): string {
  const KEY_PHRASES: Record<string, string> = {
    name: "your name",
    wife_name: "your wife's name",
    husband_name: "your husband's name",
    mother_name: "your mother's name",
    father_name: "your father's name",
    sister_name: "your sister's name",
    brother_name: "your brother's name",
    best_friend_name: "your best friend's name",
    favorite_color: "your favorite color",
    favorite_food: "your favorite food",
    favorite_movie: "your favorite movie",
    birthday: "your birthday",
    job_title: "your job title",
    company: "the company you work at",
    city: "the city you live in",
  };

  if (KEY_PHRASES[key]) {
    return KEY_PHRASES[key];
  }

  // Fallback for any key not explicitly mapped above: turn
  // "some_key" into "your some key" as a reasonable generic phrasing.
  return `your ${key.replace(/_/g, " ")}`;
}

export function isQuestion(input: string): boolean {
  const trimmed = input.trim();

  if (trimmed.endsWith("?")) return true;

  const interrogativeStarters =
    /^(what|which|who|whom|whose|where|when|why|how|is|are|do|does|did|can|could|will|would|should)\b/i;

  // Roman Urdu question markers — these often appear mid-sentence
  // (e.g. "Ami ka naam kya hai") rather than at the start, and STT
  // frequently drops the trailing "?", so check for them anywhere.
const urduQuestionMarkers =
  /\b(kya|kia|kiya|kaun|kahan|kab|kyun|kyu|kaise|kese|batao|bata do)\b/i;

  return (
    interrogativeStarters.test(trimmed) ||
    urduQuestionMarkers.test(trimmed)
  );
}

// brain.ts — return type badalna hai
// brain.ts — return type badalna hai

export async function aiBrain(
  input: string
): Promise<{ text: string; language: "en" | "ur" }> {
  const query = input.toLowerCase();
  const language = detectLanguage(input);

  // Forget all memories
  if (query.includes("forget everything")) {
    await memoryForget.forgetAll();
    return {
      text: language === "ur"
        ? "Theek hai. Maine aapke baray mein sab kuch bhula diya hai."
        : "Done. I've forgotten everything I knew about you.",
      language,
    };
  }
  

  // Forget specific memory
  if (query.startsWith("forget my ")) {
    const key = query
      .replace("forget my ", "")
      .replace("favourite", "favorite")
      .replace(/\?/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const deleted = await memoryForget.forgetByKey(key);
    const readableKey = key.replace(/_/g, " ");

    if (language === "ur") {
      return {
        text: deleted
          ? `Theek hai. Maine aapki ${readableKey} bhula di hai.`
          : `Mujhe ${readableKey} ke baray mein kuch nahi mila.`,
        language,
      };
    }

    return {
      text: deleted
        ? `Done. I've forgotten your ${readableKey}.`
        : `I couldn't find anything stored for ${readableKey}.`,
      language,
    };
  }

  // Memory Recall (full dump) -- checked BEFORE the single-fact
  // question retrieval below, since "what do you know about me" is
  // itself a question and would otherwise be swallowed by isQuestion()
  // and fail single-fact retrieval instead of reaching this dump.
  if (
    query.includes("what do you know about me") ||
    query.includes("what do you remember about me")
  ) {
    const memories = await memoryManager.getAll();

    if (memories.length === 0) {
      return {
        text: language === "ur"
          ? "Abhi tak mujhe aapke baray mein kuch pata nahi hai."
          : "I don't have any long-term memories about you yet.",
        language,
      };
    }

   const header =
      language === "ur"
        ? "Ye hai jo mujhe aapke baray mein pata hai:"
        : "Here's what I know about you:";

 const factsSentence = memories
      .map((m) => `${keyToNaturalPhrase(m.key)} is ${m.value}`)
      .join(", ");

    return {
      text: `${header} ${factsSentence}.`,
      language,
    };
  }

  // Memory retrieval
  if (isQuestion(input)) {
    const relevantMemory = await memoryRetriever.retrieve(input);

    if (relevantMemory) {
      return {
        text: memoryResponder.respond(relevantMemory, language),
        language,
      };
    }
    // Strict retriever found no valid match — don't fall through to
    // buildPrompt(), which does its own loose/unvalidated memory search
    // and can leak raw "key: value" pairs into the LLM's response.
    return {
      text: language === "ur"
        ? "Mujhe iska sahi jawab nahi mila. Kya aap dobara pooch sakte hain?"
        : "I don't have a confident answer for that. Could you rephrase the question?",
      language,
    };
  }

  const personalFactMarkers =
    /\b(mera|meri|mere|my)\b.*\b(naam|name)\b|\b(naam|name)\b.*\b(hai|is)\b/i;

  if (personalFactMarkers.test(input)) {
    return {
      text: language === "ur"
        ? "Theek hai, maine ye yaad rakh liya hai."
        : "Got it, I've noted that down.",
      language,
    };
  }

  const prompt = await buildPrompt(input);
  const languageInstruction =
    language === "ur"
      ? "\n\nIMPORTANT: The user wrote in Roman Urdu. Reply in Roman Urdu (Latin script), not English, not Arabic/Devanagari script."
      : "\n\nIMPORTANT: The user wrote in English. Reply in English.";

  const responseText = await provider.chat(prompt + languageInstruction);

  return { text: responseText, language };
}

async function classifyReplyLLM(
  originalContact: string,
  originalMessage: string,
  userReply: string
): Promise<
  | { action: "change_contact"; contact: string }
  | { action: "change_message"; message: string }
  | { action: "both"; contact: string; message: string }
  | { action: "unknown" }
> {
  const prompt = `Current WhatsApp draft:
Contact: "${originalContact}"
Message: "${originalMessage}"

The user just said: "${userReply}"

Figure out what they want to change. Ignore filler words like "no", "yes", "actually", "change it", "I said" — these are instructions, not content. The real new content is whatever specific name or message text appears in what they said.

Reply with ONLY this exact JSON format, nothing else — no explanation, no markdown, no code fences:
{"contact": "<new contact name or null>", "message": "<new message text or null>"}

Rules:
- If they are not changing the contact, "contact" must be null.
- If they are not changing the message, "message" must be null.
- Never repeat the current contact or current message back as if it were new — only put NEW/DIFFERENT values, otherwise null.

Reply:`;

  try {
    const response = await provider.chat(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { action: "unknown" };

    const parsed = JSON.parse(jsonMatch[0]);

    const contact =
      parsed.contact && String(parsed.contact).trim().toLowerCase() !== "null"
        ? String(parsed.contact).trim()
        : null;

    const message =
      parsed.message && String(parsed.message).trim().toLowerCase() !== "null"
        ? String(parsed.message).trim()
        : null;

    const contactChanged =
      contact && contact.toLowerCase() !== originalContact.trim().toLowerCase();

    const messageChanged =
      message && message.toLowerCase() !== originalMessage.trim().toLowerCase();

    if (contactChanged && messageChanged) {
      return { action: "both", contact: contact!, message: message! };
    }
    if (contactChanged) {
      return { action: "change_contact", contact: contact! };
    }
    if (messageChanged) {
      return { action: "change_message", message: message! };
    }

    return { action: "unknown" };
  } catch {
    return { action: "unknown" };
  }
}

export async function classifyWhatsAppCorrection(
  originalContact: string,
  originalMessage: string,
  userReply: string
): Promise<
  | { action: "send" }
  | { action: "cancel" }
  | { action: "change_contact"; contact: string }
  | { action: "change_message"; message: string }
  | { action: "both"; contact: string; message: string }
  | { action: "unknown" }
> {
  const lower = userReply.trim().toLowerCase();

   if (/\b(cancel|stop|forget it|never mind|don't send|do not send|dont send)\b/i.test(lower)) {
    return { action: "cancel" };
  }
  
  // Fixed, limited vocabulary — regex stays reliable here.
   if (
    /\b(yes|yeah|yep|yup|correct|looks good|sounds good|perfect|go ahead|proceed)\b/i.test(lower) ||
    /\bsend it\b/i.test(lower) ||
    /\bsend now\b/i.test(lower) ||
    /\bplease send\b/i.test(lower) ||
    /^send\.?$/i.test(lower)
  ) {
    return { action: "send" };
  }

  

  // Open-ended phrasing — single combined LLM call, so the model
  // judges contact-vs-message together in one shot instead of two
  // independent calls losing context of each other.
  const result = await classifyReplyLLM(originalContact, originalMessage, userReply);

  console.log("[WhatsApp Classifier]", result);

  return result;
}