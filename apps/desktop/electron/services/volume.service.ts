import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class VolumeService {
  /**
   * Increase system volume by a percentage.
   * Default: 10%
   */
  async increase(step = 10): Promise<void> {
    const script = `
      Add-Type -AssemblyName presentationCore;
      $volume = [Math]::Min(100, ${step});
      1..$volume | ForEach-Object {
        (New-Object -ComObject WScript.Shell).SendKeys([char]175)
      }
    `;

    await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script}"`
    );
  }
}