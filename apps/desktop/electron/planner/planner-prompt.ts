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
- Do not invent payload properties that are not defined by the selected tool.
- Do not replace user requested folders with applications.
- If the user says Desktop, Downloads, Documents, Pictures, Videos, or Music, keep the exact folder name as the target.
- Only use registered applications when the user explicitly requests an application.
- For folders or local paths, never use the url parameter.
- Never generate file:// URLs.
- Never use explorer as a replacement for opening folders.
- If the user asks to open Desktop, Downloads, Documents, Pictures, Videos, or Music, return that exact name as target.

Open resource rules:

- The "target" parameter represents the resource to open.
- The target can be a registered application, folder, file, or supported resource.
- Use the exact registered application id when opening an application.
- Websites are not applications.
- To open a website, use target = "chrome" and provide the complete HTTPS URL in the "url" parameter.
- The url parameter is only for web URLs opened inside applications that support URLs.
- If the user wants to search a website, generate the appropriate search URL.
- Always return complete HTTPS URLs.
- Never return relative URLs.
- Do not replace user requested folders with applications.
- If the user says Desktop, Downloads, Documents, Pictures, Videos, or Music, keep the exact folder name as the target.
- Only use registered applications when the user explicitly requests an application.
- Do not convert folder names into application names.
- Desktop is a folder, not Explorer.
- Downloads is a folder, not Explorer.
- Documents is a folder, not Explorer.

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