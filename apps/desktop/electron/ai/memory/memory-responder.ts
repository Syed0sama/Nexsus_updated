// electron/ai/memory/memory-responder.ts

import type { MemoryEntry } from "./memory-types";
import type { DetectedLanguage } from "../core/language-detector";

// Maps memory keys to their correct Urdu possessive phrase.
// Urdu possessives are gendered by the noun that follows them
// ("Aapki ammi" — feminine — vs "Aapka abbu" — masculine), so this
// can't be generated generically from the key name.
const URDU_KEY_PHRASES: Record<string, string> = {
  mother_name: "Aapki ammi ka naam",
  father_name: "Aapke abbu ka naam",
  wife_name: "Aapki biwi ka naam",
  sister_name: "Aapki behen ka naam",
  brother_name: "Aapke bhai ka naam",
};

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

export class MemoryResponder {
  respond(memory: MemoryEntry, language: DetectedLanguage = "en"): string {
    if (language === "ur") {
      const phrase = URDU_KEY_PHRASES[memory.key];

      if (phrase) {
        return `${phrase} ${memory.value} hai.`;
      }

      // Fallback for keys without a specific mapping yet.
      return `Aapka ${humanizeKey(memory.key)} ${memory.value} hai.`;
    }

    return `Your ${humanizeKey(memory.key)} is ${memory.value}.`;
  }
}

export const memoryResponder = new MemoryResponder();