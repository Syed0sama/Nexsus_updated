import { spawn } from "child_process";

const POWERSHELL =
  "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/PowerShell.exe";

// Shared PowerShell helper block reused by every method that needs to
// find and force-focus the WhatsApp window.
const WIN_FOCUS_HELPERS = `
Add-Type -AssemblyName System.Windows.Forms;
Add-Type -AssemblyName System.Drawing;

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

    $wasMinimized = [WinFocus]::IsIconic($hwnd)
    if ($wasMinimized) {
        [WinFocus]::ShowWindow($hwnd, 9) | Out-Null
        Start-Sleep -Milliseconds 500
    }

    $rect = New-Object RECT
    [WinFocus]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    $w = $rect.Right - $rect.Left
    $h = $rect.Bottom - $rect.Top

    if ($w -lt 400 -or $h -lt 300) {
        [WinFocus]::ShowWindow($hwnd, 1) | Out-Null
        Start-Sleep -Milliseconds 300
        [WinFocus]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
        $w = $rect.Right - $rect.Left
        $h = $rect.Bottom - $rect.Top
        if ($w -lt 400 -or $h -lt 300) {
            [WinFocus]::ShowWindow($hwnd, 3) | Out-Null
            Start-Sleep -Milliseconds 300
        }
    }

    $foreThread = [WinFocus]::GetWindowThreadProcessId([WinFocus]::GetForegroundWindow(), [ref]0)
    $targetProcId = 0
    $targetThread = [WinFocus]::GetWindowThreadProcessId($hwnd, [ref]$targetProcId)
    $curThread = [WinFocus]::GetCurrentThreadId()

    $attached1 = [WinFocus]::AttachThreadInput($curThread, $targetThread, $true)
    $attached2 = [WinFocus]::AttachThreadInput($foreThread, $targetThread, $true)

    [WinFocus]::ShowWindow($hwnd, 9) | Out-Null
    [WinFocus]::BringWindowToTop($hwnd) | Out-Null
    [WinFocus]::SetForegroundWindow($hwnd) | Out-Null
    [WinFocus]::SetFocus($hwnd) | Out-Null

    if ($attached1) { [WinFocus]::AttachThreadInput($curThread, $targetThread, $false) | Out-Null }
    if ($attached2) { [WinFocus]::AttachThreadInput($foreThread, $targetThread, $false) | Out-Null }

    Start-Sleep -Milliseconds 200

    if ([WinFocus]::GetForegroundWindow() -ne $hwnd) {
        [WinFocus]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
        [WinFocus]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
        [WinFocus]::SetForegroundWindow($hwnd) | Out-Null
        [WinFocus]::SetFocus($hwnd) | Out-Null
        Start-Sleep -Milliseconds 200
    }

    return ([WinFocus]::GetForegroundWindow() -eq $hwnd)
}

function Find-WhatsAppProcess {
    $p = Get-Process | Where-Object {
        $_.MainWindowHandle -ne 0 -and $_.ProcessName -like "*WhatsApp*"
    } | Select-Object -First 1
    if ($p) { return $p }

    $p = Get-Process -Name "ApplicationFrameHost" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*WhatsApp*"
        } | Select-Object -First 1

    return $p
}
`;

function runPowerShell(script: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      POWERSHELL,
      ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script],
      { stdio: "pipe", windowsHide: true }
    );

    child.stdout.on("data", (data) => console.log("PS OUT:", data.toString()));
    child.stderr.on("data", (data) => console.log("PS ERR:", data.toString()));

    child.on("error", reject);
    child.on("close", () => resolve());
  });
}

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
          `Start-Process "shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App"`,
        ],
        { stdio: "pipe", windowsHide: true }
      );

      child.stderr?.on("data", (data) => {
        console.error("WHATSAPP OPEN ERROR:", data.toString());
      });

      child.on("error", reject);
      child.on("close", () => resolve());
    });
  }

  /**
   * Focuses WhatsApp, searches for and opens the given contact's chat,
   * and types the message into the compose box. Only presses Enter to
   * actually send it if `send` is true — otherwise the message is left
   * typed in the box, waiting for a separate confirm step.
   */
  async typeMessage(contact: string, message: string, send: boolean): Promise<void> {
    console.log("WHATSAPP TYPE:", contact, message, "send=", send);

    await this.open();
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));

    const sendTail = send
      ? `
Start-Sleep -Seconds 1;
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}");
`
      : "";

    const script = `
${WIN_FOCUS_HELPERS}

$process = $null;
for ($i = 0; $i -lt 20 -and -not $process; $i++) {
    $process = Find-WhatsAppProcess;
    if (-not $process) { Start-Sleep -Milliseconds 300 }
}

if ($process) {
    $hwnd = $process.MainWindowHandle;
    $wasMinimizedAtStart = [WinFocus]::IsIconic($hwnd);

    $ok = $false;
    for ($i = 0; $i -lt 5 -and -not $ok; $i++) {
        $ok = Set-ForceForeground -hwnd $hwnd;
        if (-not $ok) { Start-Sleep -Milliseconds 500 }
    }

    if ($wasMinimizedAtStart) { Start-Sleep -Seconds 2 } else { Start-Sleep -Seconds 1 }

    Set-ForceForeground -hwnd $hwnd | Out-Null;
    Start-Sleep -Milliseconds 200;

    $rectNow = New-Object RECT
    [WinFocus]::GetWindowRect($hwnd, [ref]$rectNow) | Out-Null
    $winW = $rectNow.Right - $rectNow.Left
    $clickX = $rectNow.Left + [int]($winW * 0.15)
    $clickY = $rectNow.Top + 95

    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($clickX, $clickY)
    Start-Sleep -Milliseconds 400
    [WinFocus]::mouse_event(0x0002, 0, 0, 0, 0)
    [WinFocus]::mouse_event(0x0004, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 500

    [System.Windows.Forms.SendKeys]::SendWait("^f");
    Start-Sleep -Milliseconds 700;
    [System.Windows.Forms.SendKeys]::SendWait("^a");
    Start-Sleep -Milliseconds 200;
    [System.Windows.Forms.SendKeys]::SendWait("{DEL}");
    Start-Sleep -Milliseconds 300;


    [System.Windows.Forms.SendKeys]::SendWait("${contact}");
    Start-Sleep -Seconds 2;
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}");
    Start-Sleep -Seconds 3;

    # Click compose box
$composeX = $rectNow.Left + [int](($rectNow.Right - $rectNow.Left) * 0.70)
$composeY = $rectNow.Bottom - 55

[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($composeX, $composeY)
Start-Sleep -Milliseconds 300
[WinFocus]::mouse_event(0x0002,0,0,0,0)
[WinFocus]::mouse_event(0x0004,0,0,0,0)
Start-Sleep -Milliseconds 300

# Clear previous draft
[System.Windows.Forms.SendKeys]::SendWait("^a")
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait("{DEL}")
Start-Sleep -Milliseconds 300

# Type message
[System.Windows.Forms.SendKeys]::SendWait("${message}");
${sendTail}

} else {
    Write-Output "WhatsApp window not found";
}
`;

    await runPowerShell(script);
    console.log("WHATSAPP TYPE DONE");
  }

  /** Backward-compatible wrapper: types AND sends immediately. */
  async sendMessage(contact: string, message: string): Promise<void> {
    return this.typeMessage(contact, message, true);
  }

  /**
   * Focuses WhatsApp (chat + compose box already open from a prior
   * typeMessage call) and presses Enter to send whatever is currently
   * typed. Used after the user says "proceed"/"send it".
   */
  async sendPendingEnter(): Promise<void> {
  const script = `
${WIN_FOCUS_HELPERS}

$process = $null;
for ($i = 0; $i -lt 10 -and -not $process; $i++) {
    $process = Find-WhatsAppProcess;
    if (-not $process) { Start-Sleep -Milliseconds 300 }
}

if ($process) {
    $hwnd = $process.MainWindowHandle;
    $ok = $false;
    for ($i = 0; $i -lt 5 -and -not $ok; $i++) {
        $ok = Set-ForceForeground -hwnd $hwnd;
        if (-not $ok) { Start-Sleep -Milliseconds 300 }
    }
    Write-Output "Focus acquired: $ok";
    Start-Sleep -Milliseconds 500;

    # Click into the message compose box (bottom area of the chat
    # window) before pressing Enter -- foregrounding the window alone
    # doesn't guarantee the text input still has keyboard focus.
    $rectNow = New-Object RECT
    [WinFocus]::GetWindowRect($hwnd, [ref]$rectNow) | Out-Null
    $composeX = $rectNow.Left + [int](($rectNow.Right - $rectNow.Left) * 0.75)
    $composeY = $rectNow.Bottom - 40

    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($composeX, $composeY)
    Start-Sleep -Milliseconds 300
    [WinFocus]::mouse_event(0x0002, 0, 0, 0, 0)
    [WinFocus]::mouse_event(0x0004, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 400

    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}");
    Write-Output "Enter sent";
} else {
    Write-Output "WhatsApp window not found";
}
`;

  await runPowerShell(script);
  console.log("WHATSAPP SEND PENDING DONE");
}
  /**
   * Clears whatever is in the message compose box (assumed still
   * focused there from the previous typeMessage call, since we never
   * touched the search box again) and types a new message. Does NOT
   * re-search for the contact -- the chat is assumed already open.
   */
  async retypeMessageOnly(newMessage: string, send: boolean): Promise<void> {
    const sendTail = send
      ? `
Start-Sleep -Seconds 1;
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}");
`
      : "";

    const script = `
${WIN_FOCUS_HELPERS}

$process = $null;
for ($i = 0; $i -lt 10 -and -not $process; $i++) {
    $process = Find-WhatsAppProcess;
    if (-not $process) { Start-Sleep -Milliseconds 300 }
}

if ($process) {
    $hwnd = $process.MainWindowHandle;
    $ok = $false;
    for ($i = 0; $i -lt 5 -and -not $ok; $i++) {
        $ok = Set-ForceForeground -hwnd $hwnd;
        if (-not $ok) { Start-Sleep -Milliseconds 300 }
    }
   Start-Sleep -Milliseconds 300;

$rectNow = New-Object RECT
[WinFocus]::GetWindowRect($hwnd, [ref]$rectNow) | Out-Null

$composeX = $rectNow.Left + [int](($rectNow.Right - $rectNow.Left) * 0.70)
$composeY = $rectNow.Bottom - 55

[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($composeX, $composeY)
Start-Sleep -Milliseconds 300
[WinFocus]::mouse_event(0x0002,0,0,0,0)
[WinFocus]::mouse_event(0x0004,0,0,0,0)
Start-Sleep -Milliseconds 300

[System.Windows.Forms.SendKeys]::SendWait("^a");
    Start-Sleep -Milliseconds 200;
    [System.Windows.Forms.SendKeys]::SendWait("{DEL}");
    Start-Sleep -Milliseconds 300;
    [System.Windows.Forms.SendKeys]::SendWait("${newMessage}");
    ${sendTail}
} else {
    Write-Output "WhatsApp window not found";
}
`;

    await runPowerShell(script);
    console.log("WHATSAPP RETYPE MESSAGE DONE");
  }

  /**
 * Clears whatever is currently typed in the compose box, without
 * typing anything new. Used when the user cancels a pending message.
 */
async clearDraft(): Promise<void> {
  return this.retypeMessageOnly("", false);
}

  /**
   * Opens a contact's chat and clicks the call icon in the chat header --
   * voice call by default, video call when isVideo is true.
   */
  async call(contact: string, isVideo: boolean = false): Promise<void> {
    console.log("WHATSAPP CALL:", contact, isVideo ? "(video)" : "(voice)");

    await this.open();
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));

    const callIconOffsetX = isVideo ? 230 : 140;

    const script = `
${WIN_FOCUS_HELPERS}

$process = $null;
for ($i = 0; $i -lt 20 -and -not $process; $i++) {
    $process = Find-WhatsAppProcess;
    if (-not $process) { Start-Sleep -Milliseconds 500 }
}

if ($process) {
    $hwnd = $process.MainWindowHandle;
    $wasMinimizedAtStart = [WinFocus]::IsIconic($hwnd);

    $ok = $false;
    for ($i = 0; $i -lt 5 -and -not $ok; $i++) {
        $ok = Set-ForceForeground -hwnd $hwnd;
        if (-not $ok) { Start-Sleep -Milliseconds 500 }
    }

    if ($wasMinimizedAtStart) { Start-Sleep -Seconds 2 } else { Start-Sleep -Seconds 1 }

    Set-ForceForeground -hwnd $hwnd | Out-Null;
    Start-Sleep -Milliseconds 200;

    $rectNow = New-Object RECT
    [WinFocus]::GetWindowRect($hwnd, [ref]$rectNow) | Out-Null
    $winW = $rectNow.Right - $rectNow.Left
    $clickX = $rectNow.Left + [int]($winW * 0.15)
    $clickY = $rectNow.Top + 95

    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($clickX, $clickY)
    Start-Sleep -Milliseconds 400
    [WinFocus]::mouse_event(0x0002, 0, 0, 0, 0)
    [WinFocus]::mouse_event(0x0004, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 500

    [System.Windows.Forms.SendKeys]::SendWait("^f");
    Start-Sleep -Milliseconds 700;
    [System.Windows.Forms.SendKeys]::SendWait("^a");
    Start-Sleep -Milliseconds 200;
    [System.Windows.Forms.SendKeys]::SendWait("{DEL}");
    Start-Sleep -Milliseconds 300;
    [System.Windows.Forms.SendKeys]::SendWait("${contact}");
    Start-Sleep -Seconds 2;
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}");
    Start-Sleep -Seconds 3;

    $rectChat = New-Object RECT
    [WinFocus]::GetWindowRect($hwnd, [ref]$rectChat) | Out-Null
    $callX = $rectChat.Right - ${callIconOffsetX}
    $callY = $rectChat.Top + 70

    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($callX, $callY)
    Start-Sleep -Milliseconds 400
    [WinFocus]::mouse_event(0x0002, 0, 0, 0, 0)
    [WinFocus]::mouse_event(0x0004, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 500
} else {
    Write-Output "WhatsApp window not found";
}
`;

    await runPowerShell(script);
    console.log("WHATSAPP CALL DONE");
  }
}

export const whatsAppService = new WhatsAppService();