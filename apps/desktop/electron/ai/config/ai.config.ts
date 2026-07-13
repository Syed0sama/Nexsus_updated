export const aiConfig = {
  provider: "ollama",

  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama3",
    stream: false,
  },
} as const;