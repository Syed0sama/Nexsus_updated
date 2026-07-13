import { ipcMain } from "electron";

import { routeCommand } from "../brain/command-router";
import type { NexusInvokeArgs } from "../shared-types";

export function registerCommandHandler(): void {
  ipcMain.handle(
    "nexus:invoke",
    async (_event, args: NexusInvokeArgs) => {
      const command = args?.command;
      const payload = args?.payload;

      return routeCommand(command, payload);
    }
  );
}