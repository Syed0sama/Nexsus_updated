import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class BrightnessService {
  private readonly powershell =
    "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";

  private async execute(script: string): Promise<string> {
    const { stdout } = await execAsync(
      `${this.powershell} -NoProfile -ExecutionPolicy Bypass -Command "${script}"`
    );

    return stdout.trim();
  }

  async increase(step = 10): Promise<void> {
    const current = await this.get();

    const target = Math.min(
      100,
      current + Math.max(1, step)
    );

    await this.set(target);
  }

  async decrease(step = 10): Promise<void> {
    const current = await this.get();

    const target = Math.max(
      0,
      current - Math.max(1, step)
    );

    await this.set(target);
  }

  async set(value: number): Promise<void> {
    const target = Math.max(
      0,
      Math.min(100, value)
    );

    const script =
      `(Get-WmiObject -Namespace root\\WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${target})`;

    await this.execute(script);
  }

  async get(): Promise<number> {
    const script =
      "(Get-WmiObject -Namespace root\\WMI -Class WmiMonitorBrightness).CurrentBrightness";

    const output = await this.execute(script);

    const brightness = Number(output);

    if (Number.isNaN(brightness)) {
      throw new Error(
        "FAILED_TO_READ_BRIGHTNESS"
      );
    }

    return brightness;
  }
}

export const brightnessService =
  new BrightnessService();

export async function increaseBrightness(
  step = 10
): Promise<void> {
  await brightnessService.increase(step);
}

export async function decreaseBrightness(
  step = 10
): Promise<void> {
  await brightnessService.decrease(step);
}

export async function setBrightness(
  value: number
): Promise<void> {
  await brightnessService.set(value);
}

export async function getBrightness(): Promise<number> {
  return brightnessService.get();
}