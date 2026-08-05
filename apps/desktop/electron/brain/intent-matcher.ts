import type { ExecutionPlan } from "./types";

interface IntentRule {
  patterns: RegExp[];
  plan: (text: string, match: RegExpMatchArray | null) => ExecutionPlan;
}

const RULES: IntentRule[] = [
  // ---------- TIME ----------
  {
    patterns: [
      /\bwhat(?:'s| is)? the time\b/i,
      /\bcurrent time\b/i,
      /\btime now\b/i,
      /^\s*time\s*$/i,
    ],
    plan: () => ({
      type: "tool",
      command: "time",
      payload: {},
    }),
  },

  // ---------- BATTERY ----------
  {
    patterns: [
      /\bbattery\b/i,
      /\bbattery status\b/i,
      /\bhow much battery\b/i,
      /\bremaining battery\b/i,
      /\bcharge left\b/i,
    ],
    plan: () => ({
      type: "tool",
      command: "battery",
      payload: {},
    }),
  },

  // ---------- SCREENSHOT ----------
  {
    patterns: [
      /\btake (a )?screenshot\b/i,
      /\bcapture (the )?screen\b/i,
      /\bscreenshot\b/i,
    ],
    plan: () => ({
      type: "tool",
      command: "screenshot",
      payload: {},
    }),
  },

  // ---------- VOLUME ----------
  {
    patterns: [
      /\bvolume up\b/i,
      /\bincrease volume\b/i,
      /\bturn volume up\b/i,
    ],
    plan: () => ({
      type: "tool",
      command: "volume",
      payload: {
        action: "increase",
      },
    }),
  },

  {
    patterns: [
      /\bvolume down\b/i,
      /\bdecrease volume\b/i,
      /\blower volume\b/i,
    ],
    plan: () => ({
      type: "tool",
      command: "volume",
      payload: {
        action: "decrease",
      },
    }),
  },

  {
    patterns: [
      /\bmute\b/i,
      /\bmute volume\b/i,
    ],
    plan: () => ({
      type: "tool",
      command: "volume",
      payload: {
        action: "mute",
      },
    }),
  },

  {
    patterns: [
      /\bset volume to (\d{1,3})/i,
      /\bvolume (\d{1,3})/i,
    ],
    plan: (text, match) => ({
      type: "tool",
      command: "volume",
      payload: {
        action: "set",
        value: Number(match?.[1]),
      },
    }),
  },
];

export function matchIntent(input: string): ExecutionPlan | null {
  const text = input.trim();

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);

      if (match) {
        return rule.plan(text, match);
      }
    }
  }

  return null;
}