import type { AIProvider } from "./provider";
import { aiConfig } from "../config/ai.config";

type OllamaResponse = {
  response: string;
};

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  async chat(prompt: string): Promise<string> {
    const res = await fetch(`${aiConfig.ollama.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.ollama.model,
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

  async stream(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const res = await fetch(`${aiConfig.ollama.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.ollama.model,
        prompt,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error("Ollama streaming request failed");
    }

    if (!res.body) {
      throw new Error("Response body is missing.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const json = JSON.parse(line) as {
            response?: string;
          };

          if (json.response) {
            onChunk(json.response);
          }
        } catch {
          // Ignore incomplete JSON fragments
        }
      }
    }

    // Handle any remaining buffered JSON
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer) as {
          response?: string;
        };

        if (json.response) {
          onChunk(json.response);
        }
      } catch {
        // Ignore invalid final chunk
      }
    }
  }
}

export const ollamaProvider = new OllamaProvider();