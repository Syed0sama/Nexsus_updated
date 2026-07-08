import { aiBrain } from "./brain";
import { toolRouter } from "../tools/tool-router";

export async function orchestrate(text: string) {
  const aiResponse = await aiBrain(text);

  return toolRouter(aiResponse);
}