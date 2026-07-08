import { provider } from "../provider";
import { buildPrompt } from "./prompt-builder";
import { parseResponse } from "./response-parser";


export async function aiBrain(input: string) {
const prompt = buildPrompt(input);
  const response = await provider.chat(prompt);


  try {
    return JSON.parse(response);
  } catch {
    return parseResponse(response);
  }
}