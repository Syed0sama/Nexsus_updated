import type { ICommand } from "./types";

export class CommandRegistry {
  private readonly commands = new Map<string, ICommand>();

  register(command: ICommand): void {
    const key = command.name.trim().toLowerCase();

    if (this.commands.has(key)) {
      throw new Error(
        `Command "${command.name}" is already registered.`
      );
    }

    this.commands.set(key, command);
  }

  get(name: string): ICommand | undefined {
    return this.commands.get(
      name.trim().toLowerCase()
    );
  }

  has(name: string): boolean {
    return this.commands.has(
      name.trim().toLowerCase()
    );
  }

  list(): string[] {
    return [...this.commands.values()].map(
      (command) => command.name
    );
  }

  getDescriptions() {
    return [...this.commands.values()].map(
      (command) => ({
        name: command.name,
        description: command.description,
        parameters: command.parameters ?? [],
      })
    );
  }
}

export const registry = new CommandRegistry();