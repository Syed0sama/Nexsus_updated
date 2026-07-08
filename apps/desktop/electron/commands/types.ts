export interface CommandContext {
  payload?: unknown;
}

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ICommand {
  readonly name: string;

  execute(context: CommandContext): Promise<CommandResult>;
}