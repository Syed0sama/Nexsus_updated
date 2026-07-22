import { app, BrowserWindow } from "electron";
import path from "path";

import { registerCommandHandler } from "./ipc/command-handler";

// WSL2/WSLg doesn't have proper GPU passthrough, so Electron's GPU
// compositing falls back to software rendering — which keeps the
// main process burning CPU in the background (even during idle UI
// updates like the recording indicator), starving CPU-heavy work
// like Whisper transcription running alongside it. Disabling hardware
// acceleration avoids that GPU-process overhead entirely.
// main.ts, disableHardwareAcceleration() ke sath hi:
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-software-rasterizer");

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  registerCommandHandler();

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});