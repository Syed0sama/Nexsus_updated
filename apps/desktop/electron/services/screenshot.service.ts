import { spawn } from "node:child_process";

export class ScreenshotService {
  private readonly powershell =
    "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";

  async capture(): Promise<string> {
    const fileName =
      `screenshot-${Date.now()}.png`;

    const script = `
$folder = [Environment]::GetFolderPath("MyPictures")
$target = Join-Path $folder "Nexus"

New-Item -ItemType Directory -Force -Path $target | Out-Null

$file = Join-Path $target "${fileName}"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds

$image = New-Object System.Drawing.Bitmap(
    $screen.Width,
    $screen.Height
)

$graphics = [System.Drawing.Graphics]::FromImage($image)

$graphics.CopyFromScreen(
    $screen.X,
    $screen.Y,
    0,
    0,
    $image.Size
)

$image.Save($file)

$graphics.Dispose()
$image.Dispose()

Write-Output $file
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
          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        }
      );

      let output = "";

      child.stdout.on(
        "data",
        (data) => {
          output += data.toString();

          console.log(
            "Screenshot stdout:",
            data.toString()
          );
        }
      );

      child.stderr.on(
        "data",
        (data) => {
          console.error(
            "Screenshot stderr:",
            data.toString()
          );
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
            resolve(
              output.trim()
            );
          } else {
            reject(
              new Error(
                `Screenshot failed with code ${code}`
              )
            );
          }
        }
      );
    });
  }
}

export const screenshotService =
  new ScreenshotService();