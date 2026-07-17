export function formatUserMemory(
  memory: Record<string, string>,
  maxFacts = 8
): string {
  const entries = Object.entries(memory);

  if (entries.length === 0) {
    return "";
  }

  const limited = entries.slice(0, maxFacts);

  const lines = limited.map(
    ([key, value]) => `- ${key} = ${value}`
  );

  return `Known User Facts:\n${lines.join("\n")}`;
}