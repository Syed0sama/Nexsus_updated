import { registry } from "../../commands/registry";
import { SYSTEM_PROMPT } from "./system-prompt";
import { conversationMemory } from "./conversation-memory";

export function buildPrompt(input: string): string {
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

  return `
${SYSTEM_PROMPT}

Available Nexus Tools:
${tools}

Conversation History:
${history}

Current User Request:
${input}
`.trim();
}