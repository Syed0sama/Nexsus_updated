
export interface AIProvider {
  readonly name: string;

  chat(
    prompt: string
  ): Promise<string>;


  stream?(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}




