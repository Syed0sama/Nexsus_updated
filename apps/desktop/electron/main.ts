import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { commands } from "./commands";
import { decide } from "./brain/router";
import type { NexusInvokeArgs } from "./types";
let mainWindow: BrowserWindow | null = null;

// IPC ROUTER
ipcMain.handle(
  "nexus:invoke",
  async (_: Electron.IpcMainInvokeEvent, args: any) => {
    const { command, payload } = args;

    if (command === "brain") {
      const decision = decide(payload?.text || "");

      const action = commands[decision.command];

      if (!action) {
        return {
          error: "UNKNOWN_BRAIN_COMMAND",
          decision
        };
      }

      return action(decision.payload || undefined);
    }

    const action = commands[command];

    if (!action) {
      return {
        error: "UNKNOWN_COMMAND",
        command
      };
    }

    return action(payload);
  }
);


// WINDOW
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL("http://localhost:5173");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});