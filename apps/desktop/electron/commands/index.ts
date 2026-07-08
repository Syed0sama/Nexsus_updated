import { registry } from "./registry";

import { PingCommand } from "./ping.command";
import { TimeCommand } from "./time.command";
import { SystemInfoCommand } from "./system-info.command";
import { AICommand } from "./ai.command";

registry.register(new PingCommand());
registry.register(new TimeCommand());
registry.register(new SystemInfoCommand());
registry.register(new AICommand());

export { registry };