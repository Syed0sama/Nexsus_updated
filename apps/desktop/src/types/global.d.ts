export {};

declare global {
  interface Window {
    nexus: {
      invoke: (command: string, payload?: unknown) => Promise<any>;
      onVoiceStateChanged: (callback: (state: string) => void) => () => void;
      onVoiceTranscript: (callback: (text: string) => void) => () => void;
      onVoiceResponse: (callback: (text: string) => void) => () => void;
    };
  }
}