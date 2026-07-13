import { spawn } from "node:child_process";
import { resolveApplication } from "./app-resolver";

const DEFAULT_CHROME_PROFILE = "Profile 2";

function normalizeUrl(url: string): string {
  let value = url.trim();

  const markdownMatch = value.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/i);

  if (markdownMatch) {
    value = markdownMatch[1];
  }

  value = value.replace(/^['"]|['"]$/g, "");

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  return value;
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

export async function openApplication(
  app: string,
  url?: string
): Promise<void> {
  const resolved = resolveApplication(app);

  if (!resolved) {
    throw new Error(`Application "${app}" not found.`);
  }

  const argumentsList: string[] = [];

  if (resolved.supportsProfile) {
    argumentsList.push(
      `--profile-directory="${DEFAULT_CHROME_PROFILE}"`
    );
  }

  if (url) {
    if (!resolved.supportsUrl) {
      throw new Error(
        `"${resolved.id}" does not support URLs.`
      );
    }

    argumentsList.push(`"${normalizeUrl(url)}"`);
  }

  const script = `
Start-Process -FilePath '${escapePowerShell(resolved.target)}' -ArgumentList '${escapePowerShell(
    argumentsList.join(" ")
  )}'
`;

  return new Promise((resolve, reject) => {
    console.log("Resolved App:", resolved);
console.log("PowerShell Script:", script);
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-Command", script],
      {
        detached: true,
        stdio: "ignore",
      }
    );

    child.once("error", reject);

    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}