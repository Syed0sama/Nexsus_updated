export interface PerformanceLog {
  provider: string;
  startedAt: number;
  endedAt: number;
  duration: number;
  success: boolean;
  error?: string;
}

export class PerformanceLogger {
  static start(): number {
    return Date.now();
  }

  static end(
    provider: string,
    startedAt: number,
    success: boolean,
    error?: unknown
  ): PerformanceLog {
    const endedAt = Date.now();

    const log: PerformanceLog = {
      provider,
      startedAt,
      endedAt,
      duration: endedAt - startedAt,
      success,
      error:
        error instanceof Error
          ? error.message
          : error
          ? String(error)
          : undefined,
    };

    console.log("\n========== Nexus AI Performance ==========");
    console.log(`Provider : ${log.provider}`);
    console.log(`Started  : ${new Date(log.startedAt).toISOString()}`);
    console.log(`Ended    : ${new Date(log.endedAt).toISOString()}`);
    console.log(`Duration : ${log.duration} ms`);
    console.log(`Success  : ${log.success}`);

    if (log.error) {
      console.log(`Error    : ${log.error}`);
    }

    console.log("==========================================\n");

    return log;
  }
}