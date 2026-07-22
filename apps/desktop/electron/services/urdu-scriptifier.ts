// electron/services/urdu-scriptifier.ts

import { ollamaProvider } from "../ai/provider/ollama";

/**
 * Converts Roman Urdu (Latin script) into native Urdu script (Arabic
 * script), for feeding into TTS voices like ur-PK-UzmaNeural which
 * are trained on native script and mispronounce Latin-script text.
 */

const COMMON_PHRASE_CACHE: Record<string, string> = {
  "Mujhe iska sahi jawab nahi mila. Kya aap dobara pooch sakte hain?":
    "مجھے اس کا صحیح جواب نہیں ملا۔ کیا آپ دوبارہ پوچھ سکتے ہیں؟",
};

export async function toUrduScript(romanText: string): Promise<string> {
  // Skip the Ollama round-trip entirely for phrases we already know
  // the correct native-script conversion for (e.g. our own hardcoded
  // fallback messages) — saves several seconds per call.
  if (COMMON_PHRASE_CACHE[romanText]) {
    console.log("[UrduScriptifier] Cache hit, skipping Ollama call.");
    return COMMON_PHRASE_CACHE[romanText];
  }

  const prompt = `Convert the following Roman Urdu (Latin script) text into native Urdu script (Arabic script).
Do NOT translate the meaning. Do NOT change the language.
Only convert the script from Roman/Latin letters to Urdu (Arabic) script.
Output ONLY the converted text, nothing else.

Text: ${romanText}`;

  try {
    const result = await ollamaProvider.chat(prompt);
    return result.trim();
  } catch (error) {
    console.warn(
      "[UrduScriptifier] Conversion failed, using original text:",
      error
    );
    return romanText;
  }
}