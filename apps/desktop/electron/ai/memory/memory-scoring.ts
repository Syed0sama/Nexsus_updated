import type { MemoryType } from "./memory-types";

export interface MemoryScore {
  confidence: number;
  importance: number;
}

export class MemoryScoring {
  score(type: MemoryType, occurrences = 1): MemoryScore {
    let confidence = 0.7;
    let importance = 0.5;

    switch (type) {
      case "preference":
        confidence = 0.9;
        importance = 0.9;
        break;

      case "profile":
        confidence = 0.95;
        importance = 1.0;
        break;

      case "relationship":
        confidence = 0.95;
        importance = 0.95;
        break;

      case "alias":
        confidence = 0.9;
        importance = 0.8;
        break;

      case "fact":
        confidence = 0.8;
        importance = 0.7;
        break;

      case "task":
      case "context":
        confidence = 0.6;
        importance = 0.4;
        break;
    }

    // Increase confidence if the same memory is observed repeatedly
    confidence = Math.min(
      1,
      confidence + (occurrences - 1) * 0.05
    );

    return {
      confidence,
      importance,
    };
  }
}

export const memoryScoring = new MemoryScoring();