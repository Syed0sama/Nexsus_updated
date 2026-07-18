import type { ExecutionPlan } from "./types";

export function matchIntent(
  input: string,
): ExecutionPlan | null {

  const text = input
    .trim()
    .toLowerCase();

  switch (text) {

    case "listen":
    case "start listening":
    case "start voice":
    case "start voice command":
      return {
        type: "tool",
        command: "voice",
        payload: {
          action: "listen",
        },
      };

    case "start recording":
    case "start voice recording":
      return {
        type: "tool",
        command: "voice",
        payload: {
          action: "start",
        },
      };

    case "stop recording":
    case "stop voice recording":
    case "stop listening":
      return {
        type: "tool",
        command: "voice",
        payload: {
          action: "stop",
        },
      };

    default:
      return null;
  }
}