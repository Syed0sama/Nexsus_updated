import { registry } from "../../commands/registry";
import { SYSTEM_PROMPT } from "./system-prompt";
import { conversationMemory } from "./conversation-memory";
import { userMemory } from "../memory/user-memory";
import { formatUserMemory } from "../memory/format-memory";
import { memoryManager } from "../memory";
import { embedText } from "../provider/embedding";

export async function buildPrompt(input: string): Promise<string> {
  const history = conversationMemory
    .all()
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  const tools = registry
    .getDescriptions()
    .map((command) => `${command.name}: ${command.description}`)
    .join("\n");

  let memoryContext = "";

  try {
    const memories = await userMemory.get();

    memoryContext = formatUserMemory(memories);

    const queryEmbedding = await embedText(input);
    const relevant = await memoryManager.searchByEmbedding(queryEmbedding);

    // Loose threshold here — this is just "context for the LLM",
    // not a confident single-answer decision, so no strict gate needed.
    const CONTEXT_THRESHOLD = 0.4;
    const topRelevant = relevant
      .filter((r) => r.score >= CONTEXT_THRESHOLD)
      .slice(0, 5);

    if (topRelevant.length > 0) {
      memoryContext += "\n\nRelevant Memories:\n";

      for (const item of topRelevant) {
        memoryContext += `- ${item.memory.key}: ${item.memory.value}\n`;
      }
    }
  } catch (error) {
    console.warn("[PromptBuilder] Failed to load user memory:", error);
  }

  return `
${SYSTEM_PROMPT}

${memoryContext}

Conversation History:
${history}

Available Nexus Tools:
${tools}

Current User Request:
${input}
`.trim();
}