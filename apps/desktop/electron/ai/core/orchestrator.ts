import { aiBrain } from "./brain";
import { PerformanceLogger } from "./performance-logger";
import { provider } from "../provider";
import { conversationMemory } from "./conversation-memory";

export async function orchestrate(text: string) {
  const startedAt = PerformanceLogger.start();

  try {
    // Save user message
    await conversationMemory.add({
      role: "user",
      content: text,
    });


    const response = await aiBrain(text);

    // Save assistant response
    await conversationMemory.add({
      role: "assistant",
      content: response,
    });

    PerformanceLogger.end(
      provider.name,
      startedAt,
      true
    );

    return {
      success: true,
      type: "chat",
      data: response,
    };
  } catch (error) {
    PerformanceLogger.end(
      provider.name,
      startedAt,
      false,
      error
    );

    throw error;
  }
}