import { registry } from "../../commands/registry";
import { SYSTEM_PROMPT } from "./system-prompt";
import { conversationMemory } from "./conversation-memory";
import { userMemory } from "../memory/user-memory";
import { formatUserMemory } from "../memory/format-memory";

export async function buildPrompt(input: string): Promise<string> {
  const history = conversationMemory
    .all()
    .map((message) => {
      return `${message.role.toUpperCase()}: ${message.content}`;
    })
    .join("\n");

  const tools = registry
    .getDescriptions()
    .map((command) => {
      return `${command.name}: ${command.description}`;
    })
    .join("\n");

  let memoryContext = "";

  try {
    const memories = await userMemory.get();

    console.log(
      "[PromptBuilder] User Memory:",
      memories
    );

    memoryContext = formatUserMemory(memories);
  } catch (error) {
    console.warn(
      "[PromptBuilder] Failed to load user memory:",
      error
    );
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