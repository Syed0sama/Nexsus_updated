export interface CommandParameter {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
}

export interface CommandContext {
  payload?: unknown;
}

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  type?: string;
}

export interface ICommand {
  readonly name: string;

  readonly description: string;

  readonly parameters?: readonly CommandParameter[];

  execute(
    context: CommandContext
  ): Promise<CommandResult>;
}