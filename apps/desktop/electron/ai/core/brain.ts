import { provider } from "../provider";
import { buildPrompt } from "./prompt-builder";

export async function aiBrain(
  input: string
): Promise<string> {
  const prompt = buildPrompt(input);

  return provider.chat(prompt);
}