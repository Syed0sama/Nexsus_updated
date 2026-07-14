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

      const plannerHints =
        (tool.plannerHints ?? []).length === 0
          ? "None"
          : (tool.plannerHints ?? [])
              .map((hint) => `    - ${hint}`)
              .join("\n");

      return `
Tool: ${tool.name}

Description:
${tool.description}

Parameters:
${parameters}

Planning Examples:
${plannerHints}
`;
    })
    .join("\n");

  const applications = getApplications()
    .map((app) => `- ${app.id}`)
    .join("\n");

  return `
You are the Nexus Planner.

Your ONLY job is to convert the user's request into a tool execution plan.

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
- If a tool accepts optional parameters and the user provides them, include them.
- Do not invent payload properties that are not defined by the selected tool.
- Use the Planning Examples of each tool to understand user intent.

Volume tool rules:

- If the user says "increase volume", use action = "increase".
- If the user says "decrease volume", use action = "decrease".
- If the user says "mute volume", use action = "mute".
- If the user specifies an exact volume (for example: "volume 80", "set volume to 50%", "make volume 100"), use action = "set" and value = the requested percentage.
- The value parameter must be a number between 0 and 100.

Brightness tool rules:

- If the user says "increase brightness", use action = "increase".
- If the user says "decrease brightness", use action = "decrease".
- If the user asks for the current brightness, use action = "get".
- If the user specifies an exact brightness (for example: "brightness 80", "set brightness to 50%", "make brightness 100"), use action = "set" and value = the requested percentage.
- The value parameter must be a number between 0 and 100.

Open resource rules:

- The "target" parameter represents the resource to open.
- The target can be a registered application, folder, file, or supported resource.
- Websites are not applications.
- To open a website use:
  target = "chrome"
  url = complete HTTPS URL
- Never generate file:// URLs.
- Never replace folders with applications.
- Desktop, Downloads, Documents, Pictures, Videos and Music are folders.
- Keep folder names exactly as requested.
- Always generate complete HTTPS URLs.
- Never generate relative URLs.

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