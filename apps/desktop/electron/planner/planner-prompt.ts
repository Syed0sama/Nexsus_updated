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
- If the request starts with What, Who, Which, When, Why, How, Do, Does, Did, Can, Could, Would, Is, Are and it does not explicitly ask to perform an action, it is almost always type="chat".

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

Memory rules:

- Questions asking about the user or previously stored information are ALWAYS chat.
- These questions NEVER require a tool.
- The AI assistant will answer them later.

Examples:

What's my name?
Who is my wife?
Who is my spouse?
What do people call me?
What browser do I use?
What's my favorite food?
What's my favorite car?
What do you know about me?
What do you remember about me?
Tell me about my family.

Return:

{
  "type":"chat",
  "text":"<copy user request exactly>"
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
- Only use the whatsapp tool when the user explicitly mentions "WhatsApp", or explicitly asks to send/message someone.
- Do NOT use whatsapp tool for search requests (e.g. "search X on YouTube", "search X on Google") — these use openApp with target='chrome'.
- Never use openApp for WhatsApp.

Example:

{
"type":"tool",
"command":"whatsapp",
"payload":{
"contact":"Ali",
"message":"hello"
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