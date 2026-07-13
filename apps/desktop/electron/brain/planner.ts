import { plan } from "../planner";
import type { ExecutionPlan } from "./types";

function normalizePlannerInput(input: string): string {
  let text = input.trim();

  // Urdu/Hinglish → English patterns
  text = text.replace(
    /^youtube\s+me\s+(.+?)\s+search\s+karo$/i,
    'Search "$1" on YouTube'
  );

  text = text.replace(
    /^google\s+me\s+(.+?)\s+search\s+karo$/i,
    'Search "$1" on Google'
  );

  text = text.replace(
    /^chrome\s+me\s+youtube\s+kholo$/i,
    "Open YouTube in Chrome"
  );

  text = text.replace(
    /^chrome\s+me\s+(.+?)\s+kholo$/i,
    'Open "$1" in Chrome'
  );

  return text;
}

export async function createExecutionPlan(
  input: string
): Promise<ExecutionPlan> {
  return plan(normalizePlannerInput(input));
}