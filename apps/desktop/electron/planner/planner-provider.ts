import { provider } from "../ai/provider";

export async function plannerProvider(
  prompt: string
): Promise<string> {
  return provider.chat(prompt);
}