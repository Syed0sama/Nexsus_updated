import { registry } from "./registry";

import { PingCommand } from "./ping.command";
import { TimeCommand } from "./time.command";
import { SystemInfoCommand } from "./system-info.command";
import { AICommand } from "./ai.command";
import { OpenAppCommand } from "./apps/open-app.command";
import { VolumeCommand } from "./system/volume-up.command";
import { BatteryCommand } from "./system/battery.command";
import { BrightnessCommand } from "./system/brightness.command";
import { ClipboardCommand } from "./system/clipboard.command";
import { NotificationCommand } from "./system/notification.command";
import { ScreenshotCommand } from "./system/screenshot.command";
import { WhatsAppCommand } from "./system/whatsapp.command";

registry.register(new PingCommand());
registry.register(new TimeCommand());
registry.register(new SystemInfoCommand());
registry.register(new AICommand());
registry.register(new OpenAppCommand());
registry.register(new VolumeCommand());
registry.register(new BatteryCommand());
registry.register(new BrightnessCommand());
registry.register(new ClipboardCommand());
registry.register(new NotificationCommand());
registry.register(new ScreenshotCommand());
registry.register(new WhatsAppCommand());

console.log("REGISTERED COMMANDS:", registry.list());

export { registry };