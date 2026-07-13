import { spawn } from "node:child_process";
import { resolveApplication } from "./app-resolver";
import { resolveFolder } from "./path-resolver";

const DEFAULT_CHROME_PROFILE = "Profile 2";

function normalizeUrl(url: string): string {
  let value = url.trim();

  const markdownMatch =
    value.match(/\[.*?\]\((https?:\/\/[^)]+)\)/i);

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

function convertWslPathToWindows(
  wslPath: string
): string {
  const match = wslPath.match(
    /^\/mnt\/([a-zA-Z])\/(.*)$/
  );

  if (!match) {
    return wslPath;
  }

  const drive = match[1].toUpperCase();

  const rest = match[2]
    .replace(/\//g, "\\");

  return `${drive}:\\${rest}`;
}

export async function openApplication(
  target: string,
  url?: string
): Promise<void> {

  let executable = "";
  const argumentsList: string[] = [];


  // Folder handling
  const folderPath = resolveFolder(target);

  if (folderPath) {
    executable = "explorer.exe";

    const windowsPath =
      convertWslPathToWindows(folderPath);

    argumentsList.push(
      `"${windowsPath}"`
    );

    console.log(
      "Resolved Folder:",
      folderPath
    );

    console.log(
      "Windows Folder Path:",
      windowsPath
    );

  } else {

    // Application handling
    const resolved =
      resolveApplication(target);

    if (!resolved) {
      throw new Error(
        `Application or folder "${target}" not found.`
      );
    }

    executable = resolved.target;


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

      argumentsList.push(
        `"${normalizeUrl(url)}"`
      );
    }
  }


  const argumentString =
    argumentsList.join(" ");


  const script =
    `Start-Process -FilePath '${escapePowerShell(
      executable
    )}' -ArgumentList '${escapePowerShell(
      argumentString
    )}'`;


  console.log(
    "Executable:",
    executable
  );

  console.log(
    "Args:",
    argumentsList
  );

  console.log(
    "PowerShell Script:",
    script
  );


  return new Promise(
    (resolve, reject) => {

      const child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          script,
        ],
        {
          detached: true,
          stdio: "ignore",
        }
      );


      child.once(
        "error",
        reject
      );


      child.once(
        "spawn",
        () => {
          child.unref();
          resolve();
        }
      );
    }
  );
}