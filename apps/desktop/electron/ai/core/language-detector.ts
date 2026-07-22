// electron/ai/core/language-detector.ts

export type DetectedLanguage = "en" | "ur";

/**
 * Common Roman Urdu function words (grammar words, not content words).
 * These appear in almost every Urdu sentence regardless of topic,
 * which makes them a reliable signal — unlike nouns/verbs which
 * could be borrowed English words even in an Urdu sentence
 * (e.g. "chrome" or "location" don't indicate language).
 */
const URDU_MARKERS = new Set([
  "hai", "hain", "ho", "tha", "thi", "thay",
  "mein", "mujhe", "mera", "meri", "mere",
  "tumhara", "tumhari", "aapka", "aapki",
  "kya", "kyun", "kaisay", "kaise", "kab", "kahan",
  "aap", "tum", "hum", "unhe", "usay", "unko",
  "ka", "ki", "ke", "ko", "se", "pe", "par",
  "nahi", "nahin", "haan", "acha", "theek",
  "kro", "karo", "krna", "karna", "diya", "dena",
  "bata", "batao", "batayen", "chahiye", "chahta", "chahti",
]);

const MIN_URDU_RATIO = 0.15; // 15%+ words being Urdu markers => Urdu

/**
 * Detects whether a piece of Roman-script text is English or Urdu,
 * based on the presence of common Urdu function words. This is a
 * deterministic, dictionary-based check — no LLM call, no guessing.
 *
 * Works on Roman Urdu specifically (Latin script), since that's
 * what this app displays and speaks. Not intended for Urdu script
 * (Arabic script) or any other language.
 */
export function detectLanguage(text: string): DetectedLanguage {
  // Arabic-script Urdu direct detect (whisper "-l auto" is output)
  const arabicScriptRatio =
    (text.match(/[\u0600-\u06FF]/g) || []).length / text.length;

  if (arabicScriptRatio > 0.3) {
    return "ur";
  }

  // ...existing Roman Urdu marker logic for typed/romanized text
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return "en";
  }

  const urduMatches = tokens.filter((token) => URDU_MARKERS.has(token)).length;
  const ratio = urduMatches / tokens.length;

  return ratio >= MIN_URDU_RATIO ? "ur" : "en";
}