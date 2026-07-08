export interface AIProvider {
  readonly name: string;

  chat(prompt: string): Promise<string>;
}