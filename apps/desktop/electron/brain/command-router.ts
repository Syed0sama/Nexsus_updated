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
console.time("[Timing] Planning");

    const plan = await normalizeAndPlan(text);
console.timeEnd("[Timing] Planning");

    console.log("======== PLANNER ========");
    console.log("INPUT:", text);
    console.log("PLAN:", plan);
    console.log("=========================");

    const result = await executor.execute(plan, source ?? "text");
console.timeEnd("[Timing] Execute");
    // Attach the tool's command name so callers (e.g. voice pipeline)
    // can build a tailored spoken response without re-deriving it.
    if (plan.type === "tool") {
      return { ...result, command: plan.command };
    }

    return result;
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