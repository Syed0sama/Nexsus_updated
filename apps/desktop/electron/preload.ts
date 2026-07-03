import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nexus", {
  invoke: (command: string, payload?: any) => {
    return ipcRenderer.invoke("nexus:invoke", {
      command,
      payload,
    });
  },
});