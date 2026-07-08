import { registry } from "../../commands";

export type ToolCall = {
  tool: string;
  payload?: any;
};

export async function toolRouter(response: any) {
  // If AI returned a tool call
  if (response?.tool) {
    const { tool, payload } = response as ToolCall;

    const command = registry.get(tool);

    if (!command) {
      return {
        success: false,
        error: "UNKNOWN_TOOL",
        tool,
      };
    }

    return command.execute({ payload });
  }

  // Normal chat response
  return {
    success: true,
    type: "chat",
    data: response,
  };
}