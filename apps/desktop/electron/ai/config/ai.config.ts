export const aiConfig = {
  provider: "ollama",
  ollama: {
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen2.5:3b",
    stream: false,
  },
} as const;