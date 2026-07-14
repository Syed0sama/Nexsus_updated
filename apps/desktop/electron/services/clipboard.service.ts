import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class ClipboardService {
  private readonly powershell =
    "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";

  private async execute(script: string): Promise<string> {
    const { stdout } = await execAsync(
      `${this.powershell} -NoProfile -ExecutionPolicy Bypass -Command "${script}"`
    );

    return stdout.trim();
  }

  async copy(text: string): Promise<void> {
    const escaped = text.replace(/'/g, "''");

    await this.execute(
      `Set-Clipboard -Value '${escaped}'`
    );
  }

  async get(): Promise<string> {
    return await this.execute(
      "Get-Clipboard"
    );
  }

  async clear(): Promise<void> {
    await this.execute(
      "Set-Clipboard -Value ''"
    );
  }
}

export const clipboardService =
  new ClipboardService();

export async function copyToClipboard(
  text: string
): Promise<void> {
  await clipboardService.copy(text);
}

export async function getClipboard(): Promise<string> {
  return clipboardService.get();
}

export async function clearClipboard(): Promise<void> {
  await clipboardService.clear();
}