import { plannerProvider } from "./planner-provider";

export async function retryPlanner(
  originalPrompt: string,
  previousResponse: string
): Promise<string> {
  const repairPrompt = `
The previous response was invalid.

You must respond with ONLY valid JSON.

Original prompt:

${originalPrompt}

Previous response:

${previousResponse}
`.trim();

  return plannerProvider(repairPrompt);
}