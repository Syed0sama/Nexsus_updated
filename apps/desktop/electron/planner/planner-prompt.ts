import { registry } from "../commands";
import { getApplications } from "../services/app-resolver";

export function buildPlannerPrompt(input: string): string {
  const tools = registry
    .getDescriptions()
    .map((tool) => {
      const parameters =
        tool.parameters.length === 0
          ? "None"
          : tool.parameters
              .map(
                (parameter) =>
                  `    - ${parameter.name} (${parameter.type}, ${
                    parameter.required ? "required" : "optional"
                  }): ${parameter.description}`
              )
              .join("\n");

      return `
Tool: ${tool.name}
Description: ${tool.description}
Parameters:
${parameters}`;
    })
    .join("\n\n");

  const applications = getApplications()
    .map((app) => `- ${app.id}`)
    .join("\n");

  return `
You are the Nexus Planner.

Your only job is to convert the user's request into a tool execution plan.

Available tools:

${tools}

Registered applications:

${applications}

Rules:

- Respond ONLY with valid JSON.
- Never use markdown.
- Never explain your reasoning.
- Never answer the user's question.
- Use ONLY the listed tools.
- Do not invent command names.
- Infer all required parameters from the user's request.
- If a tool accepts an optional parameter and the user provides it, include it.
- The "app" parameter must be one of the registered applications listed above.
- Websites such as YouTube, Google, GitHub, Reddit, Facebook, X, Instagram, etc. are NOT application names.
- To open any website, use app = "chrome" and place the complete HTTPS URL in the "url" parameter.
- If the user wants to search a website, generate the appropriate search URL.
- Always return complete HTTPS URLs.
- Never return relative URLs.
- Do not invent payload properties that are not defined by the selected tool.

Tool response:

{
  "type": "tool",
  "command": "",
  "payload": {}
}

Chat response:

{
  "type": "chat",
  "text": ""
}

User request:

${input}
`.trim();
}