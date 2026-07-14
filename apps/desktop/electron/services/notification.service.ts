import { spawn } from "node:child_process";

export class NotificationService {
  private readonly powershell =
    "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";

  async show(
    title: string,
    message: string
  ): Promise<void> {

    const escapedTitle =
      title.replace(/'/g, "''");

    const escapedMessage =
      message.replace(/'/g, "''");

    const script = `
Add-Type -AssemblyName PresentationFramework

[System.Windows.MessageBox]::Show(
'${escapedMessage}',
'${escapedTitle}'
)
`;

    return new Promise((resolve, reject) => {

      const child = spawn(
        this.powershell,
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script,
        ],
        {
          stdio: "ignore",
        }
      );

      child.once(
        "error",
        reject
      );

      child.once(
        "exit",
        (code) => {

          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `PowerShell exited with code ${code}`
              )
            );
          }

        }
      );
    });
  }
}


export const notificationService =
  new NotificationService();


export async function showNotification(
  title: string,
  message: string
): Promise<void> {
  await notificationService.show(
    title,
    message
  );
}