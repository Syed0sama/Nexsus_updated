import { registry } from "../commands";
import { getApplications } from "../services/app-resolver";
import { userMemory } from "../ai/memory/user-memory";
import { formatUserMemory } from "../ai/memory/format-memory";

export async function buildPlannerPrompt(
  input: string
): Promise<string> {
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


  let memoryBlock = "";

  try {
    const memories = await userMemory.get();

    memoryBlock = formatUserMemory(memories);

    if (memoryBlock) {
      console.log(
        "[PlannerPrompt] User Memory:",
        memories
      );
    }

  } catch (error) {
    console.warn(
      "[PlannerPrompt] Memory load failed:",
      error
    );
  }


  return `
You are the Nexus Planner.

Your ONLY job is to convert the user's request into a tool execution plan.

${memoryBlock ? `
${memoryBlock}
Use these facts only when they are relevant.
` : ""}


Available tools:

${tools}

Registered applications:

${applications}

Rules:

- Respond ONLY with valid JSON.
- Never use markdown.
- Never explain reasoning.
- Never answer the user's question.
- Use ONLY the listed tools.
- Do not invent command names.
- Infer required parameters from user request.
- Do not invent payload properties.

Chat rules:

- Greetings and normal conversation are NOT tool requests.
- If the request does not require a tool, return type="chat".
- The planner MUST NEVER answer the user's question.
- The planner MUST NEVER use User Memory.
- The planner MUST NEVER rewrite, summarize or improve the request.
- Copy the user's request VERBATIM into the "text" field.
- Do not change even a single word unless required for valid JSON.

Examples:

User:
What is my favourite color?

Return:
{
"type":"chat",
"text":"What is my favourite color?"
}

User:
My favourite color is green

Return:
{
"type":"chat",
"text":"My favourite color is green"
}

User:
Tell me a joke.

Return:
{
"type":"chat",
"text":"Tell me a joke."
}


Volume rules:

- increase volume → action="increase"
- decrease volume → action="decrease"
- mute volume → action="mute"
- exact percentage → action="set", value=number


Brightness rules:

- increase brightness → action="increase"
- decrease brightness → action="decrease"
- current brightness → action="get"
- exact percentage → action="set", value=number


Clipboard rules:

- copy text → action="copy"
- clipboard content → action="get"
- clear clipboard → action="clear"


Notification rules:

- Show notification → use notification tool.
- If one sentence provided:
 title="Nexus AI"
 message=user sentence


WhatsApp rules:

- Any WhatsApp request uses whatsapp tool.
- Never use openApp for WhatsApp.

Example:

{
"type":"tool",
"command":"whatsapp",
"payload":{
"contact":"Ali",
"message":"hello"
}
}


Open resource rules:

- target can be application, folder, file or resource.
- Website opening uses:
 target="chrome"
 url="https://..."

- Never generate file:// URLs.
- Never replace folders with applications.
- Desktop, Downloads, Documents, Pictures, Videos and Music are folders.
- WhatsApp always uses whatsapp tool.


Tool response:

{
"type":"tool",
"command":"",
"payload":{}
}





User request:

${input}

`.trim();
}