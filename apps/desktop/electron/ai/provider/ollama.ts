import type { AIProvider } from "./provider";

type OllamaResponse = {
  response: string;
};

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  async chat(prompt: string): Promise<string> {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error("Ollama request failed");
    }

    const raw = await res.json();
    const data = raw as OllamaResponse;

    return data.response;
  }
}

export const ollamaProvider = new OllamaProvider();