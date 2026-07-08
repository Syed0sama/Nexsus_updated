import { ipcMain } from "electron";

import { registry } from "../commands";
import { decide } from "../brain/router";
import type { NexusInvokeArgs } from "../shared-types";
import { aiBrain } from "../ai/core/brain";
import { toolRouter } from "../ai/tools/tool-router";

export function registerCommandHandler(): void {
  ipcMain.handle(
    "nexus:invoke",
    async (_event, args: NexusInvokeArgs) => {
      const command = args?.command;
      const payload = args?.payload;

      // AI mode
      if (command === "ai") {
  const aiResponse = await aiBrain(payload?.text || "");

  return toolRouter(aiResponse);
}

      // Brain mode
      if (command === "brain") {
        const decision = decide(payload?.text ?? "");

        const brainCommand = registry.get(decision.command);

        if (!brainCommand) {
          return {
            success: false,
            error: "UNKNOWN_BRAIN_COMMAND",
            decision,
          };
        }

        return brainCommand.execute({
          payload: decision.payload,
        });
      }

      // Direct command
      const directCommand = registry.get(command);

      if (!directCommand) {
        return {
          success: false,
          error: "UNKNOWN_COMMAND",
          command,
        };
      }

      return directCommand.execute({
        payload,
      });
    }
  );
}