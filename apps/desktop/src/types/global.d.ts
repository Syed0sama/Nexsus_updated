export {};

declare global {
  interface Window {
    nexus: {
      invoke(
        command: string,
        payload?: unknown
      ): Promise<any>;
    };
  }
}