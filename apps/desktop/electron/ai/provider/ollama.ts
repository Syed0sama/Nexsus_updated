import type { AIProvider } from "./provider";
import { aiConfig } from "../config/ai.config";
import { Agent, setGlobalDispatcher } from "undici";

type OllamaResponse = {
  response: string;
};

setGlobalDispatcher(
  new Agent({
    headersTimeout: 300_000, // 5 minutes
    bodyTimeout: 300_000,
  })
);

// Tune to actual WSL2 processor count (check with `nproc`). Passing
// num_thread explicitly stops Ollama from guessing/over-allocating
// threads that then compete with whisper/wakeword/vite for the same
// limited cores.
const OLLAMA_NUM_THREAD = 4;

// Keep the model resident in memory between calls instead of letting
// it idle-unload (was showing "Stopping..." in `ollama ps`), which
// was adding a full model-reload cost to every single request.
const OLLAMA_KEEP_ALIVE = "30m";

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  async chat(prompt: string): Promise<string> {
    console.time("[Ollama] Total");
    console.time("[Ollama] HTTP");
    const res = await fetch(
      `${aiConfig.ollama.baseUrl}/api/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiConfig.ollama.model,
          prompt,
          stream: false,
          keep_alive: OLLAMA_KEEP_ALIVE,
          options: {
          num_thread: OLLAMA_NUM_THREAD,
          num_predict: 256,
          temperature: 0,
        },
        }),
      }
    );
          console.timeEnd("[Ollama] HTTP");

    if (!res.ok) {
      console.timeEnd("[Ollama] HTTP");
  console.timeEnd("[Ollama] Total");
      throw new Error("Ollama request failed");
    }
    console.time("[Ollama] JSON");
    const raw = await res.json();
    console.timeEnd("[Ollama] JSON");
    const data = raw as OllamaResponse;
console.timeEnd("[Ollama] Total");
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
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: {
          num_thread: OLLAMA_NUM_THREAD,
        },
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