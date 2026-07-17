declare module "mic" {
  interface MicOptions {
    rate?: string;
    channels?: string;
    bitwidth?: string;
    encoding?: string;
    fileType?: string;
    exitOnSilence?: number;
  }

  interface MicInstance {
    start(): void;
    stop(): void;
    getAudioStream(): NodeJS.ReadableStream;
  }

  export default function mic(options?: MicOptions): MicInstance;
}