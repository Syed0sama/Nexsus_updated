import { app, BrowserWindow, ipcMain } from "electron";
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
    frame: false,
    hasShadow: false,             // removes the faint OS drop-shadow border
    backgroundColor: "#05060a",
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");
  mainWindow.loadURL("http://localhost:5173");
mainWindow.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(() => {
  registerCommandHandler();
  createWindow();


  ipcMain.on("window:close", () => {
  mainWindow?.close();
});

ipcMain.on("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("window:fullscreen", () => {
  mainWindow?.setFullScreen(!mainWindow.isFullScreen());
});

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