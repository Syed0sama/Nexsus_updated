import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface BatteryInfo {
  percentage: number;
  charging: boolean;
}

export class BatteryService {
  private readonly powershell =
    "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";

  async getStatus(): Promise<BatteryInfo> {
    const { stdout } = await execAsync(
      `${this.powershell} -NoProfile -Command "(Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress)"`
    );

    const battery = JSON.parse(stdout);

    return {
      percentage: battery.EstimatedChargeRemaining,
      charging: battery.BatteryStatus === 2,
    };
  }
}