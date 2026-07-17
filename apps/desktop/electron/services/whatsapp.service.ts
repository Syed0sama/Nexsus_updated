import { spawn } from "child_process";

const POWERSHELL =
  "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/PowerShell.exe";


export class WhatsAppService {


  async open(): Promise<void> {

    await new Promise<void>((resolve, reject) => {

      const child = spawn(
        POWERSHELL,
        [
          "-NoProfile",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-Command",
          `
          Start-Process "shell:AppsFolder\\\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App"
          `
        ],
        {
          stdio: "pipe",
          windowsHide: true
        }
      );


      child.on("error", reject);

      child.on("close", () => resolve());

    });

  }



  async sendMessage(
    contact: string,
    message: string
  ): Promise<void> {


    console.log(
      "WHATSAPP SEND:",
      contact,
      message
    );


    await this.open();


    await new Promise<void>(
      resolve => setTimeout(resolve, 4000)
    );



    const script = `

Add-Type -AssemblyName System.Windows.Forms;
Add-Type -AssemblyName System.Drawing;



# ================================
# FORCE WHATSAPP ACTIVE (reliable focus)
# ================================


Add-Type @"
using System;
using System.Runtime.InteropServices;

public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}

public class WinFocus {

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr SetFocus(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
}
"@



function Set-ForceForeground {
    param([IntPtr]$hwnd)

    if ($hwnd -eq [IntPtr]::Zero) { return $false }

    # 1. Restore if minimized
    $wasMinimized = [WinFocus]::IsIconic($hwnd)
    if ($wasMinimized) {
        [WinFocus]::ShowWindow($hwnd, 9) | Out-Null   # SW_RESTORE
        Start-Sleep -Milliseconds 500
    }

    # 1b. Packaged/UWP apps sometimes "restore" to a tiny cached size.
    #     Force a proper normal/maximized size in that case.
    $rect = New-Object RECT
    [WinFocus]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    $w = $rect.Right - $rect.Left
    $h = $rect.Bottom - $rect.Top

    if ($w -lt 400 -or $h -lt 300) {
        [WinFocus]::ShowWindow($hwnd, 1) | Out-Null   # SW_SHOWNORMAL
        Start-Sleep -Milliseconds 300
        [WinFocus]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
        $w = $rect.Right - $rect.Left
        $h = $rect.Bottom - $rect.Top
        if ($w -lt 400 -or $h -lt 300) {
            [WinFocus]::ShowWindow($hwnd, 3) | Out-Null   # SW_MAXIMIZE
            Start-Sleep -Milliseconds 300
        }
    }

    $foreThread = [WinFocus]::GetWindowThreadProcessId([WinFocus]::GetForegroundWindow(), [ref]0)
    $targetProcId = 0
    $targetThread = [WinFocus]::GetWindowThreadProcessId($hwnd, [ref]$targetProcId)
    $curThread = [WinFocus]::GetCurrentThreadId()

    # 2. Attach our input queue AND the current foreground thread's input queue
    #    to the target window's thread so SetForegroundWindow is honored
    #    (Windows blocks foreground switches from unrelated threads otherwise).
    $attached1 = [WinFocus]::AttachThreadInput($curThread, $targetThread, $true)
    $attached2 = [WinFocus]::AttachThreadInput($foreThread, $targetThread, $true)

    [WinFocus]::ShowWindow($hwnd, 9) | Out-Null
    [WinFocus]::BringWindowToTop($hwnd) | Out-Null
    [WinFocus]::SetForegroundWindow($hwnd) | Out-Null
    [WinFocus]::SetFocus($hwnd) | Out-Null

    if ($attached1) { [WinFocus]::AttachThreadInput($curThread, $targetThread, $false) | Out-Null }
    if ($attached2) { [WinFocus]::AttachThreadInput($foreThread, $targetThread, $false) | Out-Null }

    Start-Sleep -Milliseconds 200

    # 3. Fallback: ALT key tap trick.
    #    Windows only allows SetForegroundWindow to "steal" focus if the
    #    calling thread is in the middle of processing input. Simulating a
    #    harmless ALT keypress right before satisfies that condition and is
    #    the standard workaround when AttachThreadInput alone isn't enough.
    if ([WinFocus]::GetForegroundWindow() -ne $hwnd) {
        [WinFocus]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)       # ALT down
        [WinFocus]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)       # ALT up
        [WinFocus]::SetForegroundWindow($hwnd) | Out-Null
        [WinFocus]::SetFocus($hwnd) | Out-Null
        Start-Sleep -Milliseconds 200
    }

    return ([WinFocus]::GetForegroundWindow() -eq $hwnd)
}



function Find-WhatsAppProcess {
    # 1. Direct match: once the packaged app fully owns its window, its own
    #    process is named "WhatsApp".
    $p = Get-Process | Where-Object {
        $_.MainWindowHandle -ne 0 -and $_.ProcessName -like "*WhatsApp*"
    } | Select-Object -First 1
    if ($p) { return $p }

    # 2. Packaged-app container fallback: right after launch/restore the
    #    window can still be owned by "ApplicationFrameHost". We ONLY match
    #    title on this specific host process -- never on arbitrary
    #    processes -- otherwise a browser tab titled "WhatsApp Web" (Chrome/
    #    Edge) would be mistaken for the real WhatsApp Desktop window.
    $p = Get-Process -Name "ApplicationFrameHost" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*WhatsApp*"
        } | Select-Object -First 1

    return $p
}


$process = $null;
$wasMinimizedAtStart = $false;

for ($i = 0; $i -lt 8 -and -not $process; $i++) {
    $process = Find-WhatsAppProcess;
    if (-not $process) { Start-Sleep -Milliseconds 400 }
}


if ($process) {

    $hwnd = $process.MainWindowHandle;

    Write-Output "WhatsApp HWND: $hwnd (process: $($process.ProcessName), title: $($process.MainWindowTitle))";

    $wasMinimizedAtStart = [WinFocus]::IsIconic($hwnd);

    # Retry a few times: focus can be flaky right after another app
    # (VS Code / Chrome) just had it, or right after a cold restore.
    $ok = $false;
    for ($i = 0; $i -lt 5 -and -not $ok; $i++) {
        $ok = Set-ForceForeground -hwnd $hwnd;
        if (-not $ok) { Start-Sleep -Milliseconds 500 }
    }

    Write-Output "WhatsApp focus acquired: $ok";

} else {

    Write-Output "WhatsApp window not found";

}



# Cold restore needs extra time to actually render/lay out the UI
# before it can accept Ctrl+F / typed input.
if ($wasMinimizedAtStart) {
    Start-Sleep -Seconds 2;
} else {
    Start-Sleep -Seconds 1;
}


# Re-assert foreground right before typing starts, in case anything
# reclaimed focus during the wait above.
if ($process) {
    Set-ForceForeground -hwnd $hwnd | Out-Null;
    Start-Sleep -Milliseconds 200;

    # Window-level activation (SetForegroundWindow/SetFocus) is not enough
    # to give the Electron content itself real input focus -- a genuine
    # mouse click is needed. Compute the click point from the window's
    # CURRENT rect (not a hardcoded screen position) so it lands correctly
    # regardless of where the window is or whether it got maximized above.
    # Target: inside the left sidebar near the top, where the search box
    # normally sits.
    $rectNow = New-Object RECT
    [WinFocus]::GetWindowRect($hwnd, [ref]$rectNow) | Out-Null
    $winW = $rectNow.Right - $rectNow.Left
    $clickX = $rectNow.Left + [int]($winW * 0.15)
    $clickY = $rectNow.Top + 95

    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($clickX, $clickY)
    Start-Sleep -Milliseconds 400
    [WinFocus]::mouse_event(0x0002, 0, 0, 0, 0)   # left button down
    [WinFocus]::mouse_event(0x0004, 0, 0, 0, 0)   # left button up
    Start-Sleep -Milliseconds 500
}



# ================================
# SAME MESSAGE FLOW (unchanged)
# ================================


[System.Windows.Forms.SendKeys]::SendWait("^f");


Start-Sleep -Milliseconds 700;


[System.Windows.Forms.SendKeys]::SendWait("${contact}");


Start-Sleep -Seconds 2;


[System.Windows.Forms.SendKeys]::SendWait("{ENTER}");


Start-Sleep -Seconds 3;


[System.Windows.Forms.SendKeys]::SendWait("${message}");


Start-Sleep -Seconds 1;


[System.Windows.Forms.SendKeys]::SendWait("{ENTER}");



`;



    await new Promise<void>(
      (resolve, reject) => {


        const child = spawn(
          POWERSHELL,
          [
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script
          ],
          {
            stdio:"pipe",
            windowsHide: true
          }
        );


        child.stdout.on(
          "data",
          data => console.log(
            "PS OUT:",
            data.toString()
          )
        );


        child.stderr.on(
          "data",
          data => console.log(
            "PS ERR:",
            data.toString()
          )
        );


        child.on(
          "error",
          reject
        );


        child.on(
          "close",
          () => resolve()
        );

      }
    );


    console.log(
      "WHATSAPP DONE"
    );

  }

}


export const whatsAppService =
new WhatsAppService();