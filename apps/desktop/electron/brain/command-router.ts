import { registry } from "../commands";
import { normalizeAndPlan } from "./input-normalizer";
import { Executor } from "./executor";

const executor = new Executor();

export async function routeCommand(
  command: string,
  payload?: unknown
) {
  if (command === "brain") {
    const { text = "", source } =
      (payload as { text?: string; source?: "voice" | "text" }) ?? {};

    const plan = await normalizeAndPlan(text);

    console.log("======== PLANNER ========");
    console.log("INPUT:", text);
    console.log("PLAN:", plan);
    console.log("=========================");

    return executor.execute(plan, source ?? "text");
  }

  if (command === "ai") {
    const text =
      (payload as { text?: string })?.text ?? "";

    return executor.execute(
      {
        type: "chat",
        text,
      },
      "text"
    );
  }

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