export const commands: Record<string, (payload?: any) => any> = {
  ping: () => "pong from Nexus",

  systemInfo: () => ({
    platform: process.platform,
    version: process.version,
    memory: process.memoryUsage()
  }),

  time: () => ({
    now: new Date().toISOString()
  })
};