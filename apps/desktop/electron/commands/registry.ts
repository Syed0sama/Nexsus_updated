import type { ICommand } from "./types";

export class CommandRegistry {
  private readonly commands = new Map<string, ICommand>();

  register(command: ICommand): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command "${command.name}" is already registered.`);
    }

    this.commands.set(command.name, command);
  }

  get(name: string): ICommand | undefined {
    return this.commands.get(name);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  list(): string[] {
    return [...this.commands.keys()];
  }
}

export const registry = new CommandRegistry();