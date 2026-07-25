import { aiBrain, isQuestion } from "./brain";
import { PerformanceLogger } from "./performance-logger";
import { provider } from "../provider";
import { conversationMemory } from "./conversation-memory";
import { memoryExtractor } from "../memory/memory-extractor";
import { speak } from "../../services/tts.service";

export async function orchestrate(
  text: string,
  source: "voice" | "text" = "text"
) {
  const startedAt = PerformanceLogger.start();

  try {
    await conversationMemory.add({
      role: "user",
      content: text,
    });

    const { text: response, language } = await aiBrain(text);

    await conversationMemory.add({
      role: "assistant",
      content: response,
    });

    // Only extract facts from statements, never from questions —
    // a question's answer can be wrong/uncertain (e.g. due to STT
    // errors), so extracting "facts" from it risks poisoning memory.
    if (!isQuestion(text)) {
      void memoryExtractor.extract(text, response);
    }

   if (source === "voice") {
  try {
    await speak(response, language);
  } catch (error) {
    console.warn("[TTS] Failed:", error);
  }
}
    PerformanceLogger.end(provider.name, startedAt, true);

    return {
      success: true,
      type: "chat",
      data: response,
    };
  } catch (error) {
    PerformanceLogger.end(provider.name, startedAt, false, error);
    throw error;
  }
}