import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class VolumeService {
  private readonly powershell =
    "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";

  private async sendVolumeKey(
    key: number,
    count: number
  ): Promise<void> {
    const command =
      `(New-Object -ComObject WScript.Shell).SendKeys([char]${key})`;

    for (let i = 0; i < count; i++) {
      await execAsync(
        `${this.powershell} -NoProfile -ExecutionPolicy Bypass -Command "${command}"`
      );
    }
  }

  async increase(
    step = 10
  ): Promise<void> {
    const presses = Math.ceil(step / 2);

    await this.sendVolumeKey(
      175,
      presses
    );
  }

  async decrease(
    step = 10
  ): Promise<void> {
    const presses = Math.ceil(step / 2);

    await this.sendVolumeKey(
      174,
      presses
    );
  }

  async mute(): Promise<void> {
    await this.sendVolumeKey(
      173,
      1
    );
  }

  async set(
    value: number
  ): Promise<void> {
    const target = Math.max(
      0,
      Math.min(100, value)
    );

    // Reset volume to 0%
    await this.sendVolumeKey(
      174,
      100
    );

    // Increase to requested level
    const presses = Math.round(target / 2);

    if (presses > 0) {
      await this.sendVolumeKey(
        175,
        presses
      );
    }
  }
}