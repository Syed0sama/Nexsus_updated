import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nexus", {
  invoke: (command: string, payload?: any) => {
    return ipcRenderer.invoke("nexus:invoke", {
      command,
      payload,
    });
  },

  onVoiceStateChanged: (callback: (state: string) => void) => {
    const listener = (_event: any, state: string) => callback(state);
    ipcRenderer.on("voice-state-changed", listener);
    return () => ipcRenderer.removeListener("voice-state-changed", listener);
  },

  onVoiceTranscript: (callback: (text: string) => void) => {
    const listener = (_event: any, text: string) => callback(text);
    ipcRenderer.on("voice-transcript", listener);
    return () => ipcRenderer.removeListener("voice-transcript", listener);
  },

  onVoiceResponse: (callback: (text: string) => void) => {
    const listener = (_event: any, text: string) => callback(text);
    ipcRenderer.on("voice-response", listener);
    return () => ipcRenderer.removeListener("voice-response", listener);
  },

  minimizeWindow: () => {
    ipcRenderer.send("window:minimize");
  },

  maximizeWindow: () => {
    ipcRenderer.send("window:maximize");
  },

  fullscreenWindow: () => {
    ipcRenderer.send("window:fullscreen");
  },

  closeWindow: () => {
    ipcRenderer.send("window:close");
  }
});