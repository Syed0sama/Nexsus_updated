import { ollamaProvider } from "../ai/provider/ollama";

const DEVANAGARI_RANGE = /[\u0900-\u097F]/;
const ARABIC_RANGE = /[\u0600-\u06FF]/;

export function needsRomanization(text: string): boolean {
  return DEVANAGARI_RANGE.test(text) || ARABIC_RANGE.test(text);
}

export async function romanizeToUrdu(text: string): Promise<string> {
  const prompt = `Transliterate the following text into Roman Urdu (Latin script only).
Do NOT translate the meaning. Do NOT change the language.
Only convert the script from Urdu/Hindi script to Roman Urdu spelling.
Output ONLY the transliterated text, nothing else.

Text: ${text}`;

  const result = await ollamaProvider.chat(prompt);
  return result.trim();
}