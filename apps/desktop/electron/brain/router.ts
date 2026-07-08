export function decide(input: string) {
  const text = (input || "").toLowerCase();

  if (text.includes("system")) {
    return {
      command: "systemInfo",
      payload: undefined
    };
  }

  if (text.includes("ping")) {
    return {
      command: "ping",
      payload: undefined
    };
  }

  if (text.includes("time")) {
    return {
      command: "time",
      payload: undefined
    };
  }

return {
  command: "ai",
  payload: {
    text: input
  }
};
}