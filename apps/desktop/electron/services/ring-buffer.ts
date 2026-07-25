// Fixed-size circular buffer for raw PCM audio. Used to retain a
// short rolling window of recent audio so nothing is lost between
// wake-word detection and command recording actually starting.

export class RingBuffer {
  private chunks: Buffer[] = [];
  private totalBytes = 0;
  private readonly maxBytes: number;

  constructor(maxDurationMs: number, sampleRate = 16000, bytesPerSample = 2) {
    this.maxBytes = Math.floor((maxDurationMs / 1000) * sampleRate * bytesPerSample);
  }

  push(chunk: Buffer): void {
    this.chunks.push(chunk);
    this.totalBytes += chunk.length;

    while (this.totalBytes > this.maxBytes && this.chunks.length > 1) {
      const removed = this.chunks.shift()!;
      this.totalBytes -= removed.length;
    }
  }

  snapshot(): Buffer {
    return Buffer.concat(this.chunks);
  }

  clear(): void {
    this.chunks = [];
    this.totalBytes = 0;
  }
}