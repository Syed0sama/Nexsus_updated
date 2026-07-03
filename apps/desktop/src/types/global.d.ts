export {};

declare global {
  interface Window {
    nexus: {
      invoke: (command: string, payload?: any) => Promise<any>;
    };
  }
}