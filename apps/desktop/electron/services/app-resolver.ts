export interface AppDefinition {
  id: string;
  aliases: string[];
  target: string;
  supportsUrl?: boolean;
  supportsProfile?: boolean;
}

const APPLICATIONS: readonly AppDefinition[] = [
  {
    id: "calculator",
    aliases: ["calculator", "calc"],
    target: "calc.exe",
  },
  {
    id: "notepad",
    aliases: ["notepad"],
    target: "notepad.exe",
  },
  {
    id: "paint",
    aliases: ["paint", "mspaint"],
    target: "mspaint.exe",
  },
  {
    id: "cmd",
    aliases: ["cmd", "command prompt"],
    target: "cmd.exe",
  },
  {
    id: "powershell",
    aliases: ["powershell"],
    target: "powershell.exe",
  },
  {
    id: "explorer",
    aliases: ["explorer", "file explorer", "files"],
    target: "explorer.exe",
  },
  {
    id: "settings",
    aliases: ["settings", "windows settings"],
    target: "ms-settings:",
  },
  {
    id: "chrome",
    aliases: [
      "chrome",
      "google chrome",
      "browser",
    ],
    target: "chrome.exe",
    supportsUrl: true,
    supportsProfile: true,
  },
  {
    id: "whatsapp",
    aliases: ["whatsapp", "whats app"],
    target: "whatsapp",
  },
];

export function resolveApplication(
  name: string
): AppDefinition | undefined {
  const normalized = name.trim().toLowerCase();

  return APPLICATIONS.find((app) =>
    app.id === normalized ||
    app.aliases.some(
      (alias) => alias.toLowerCase() === normalized
    )
  );
}

export function getApplications(): readonly AppDefinition[] {
  return APPLICATIONS;
}