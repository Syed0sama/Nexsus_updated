import { app, BrowserWindow } from "electron";
import path from "path";

import { registerCommandHandler } from "./ipc/command-handler";
import { voicePipeline } from "./ai/core/voice-pipeline";
import { audioCaptureService } from "./services/audio-capture.service";



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

  // Single shared microphone stream — must start before anything
  // that subscribes to it (wakewordService, voicePipeline recording).
  audioCaptureService.start();

  // Wake word listener background mein start ho jayega
  voicePipeline.start();

  // Pipeline ke state changes ko renderer tak forward karo
  voicePipeline.on("state-change", (state: string) => {
    mainWindow?.webContents.send("voice-state-changed", state);
  });

  // User ne jo bola (transcript) renderer ko bhejo
  voicePipeline.on("transcript", (text: string) => {
    mainWindow?.webContents.send("voice-transcript", text);
  });

  // Nexus ka response renderer ko bhejo
  voicePipeline.on("response", (text: string) => {
    mainWindow?.webContents.send("voice-response", text);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});