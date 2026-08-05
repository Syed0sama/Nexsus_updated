import { EventEmitter } from "node:events";
import { wakewordService } from "../../services/wakeword.service";
import { audioCaptureService } from "../../services/audio-capture.service";
import { speechRecognizerService } from "../../services/speech-recognizer";
import { routeCommand } from "../../brain/command-router";
import { speak } from "../../services/tts.service";
import { whatsappPending } from "../../commands/system/whatsapp-pending";
import { handleWhatsAppPendingReply } from "../../commands/system/whatsapp-confirmation";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const RECORDING_DURATION_MS = 10000;
const GREETING_TEXT = "How may I assist you?";
const MAX_CONVERSATION_TURNS = 6;

function writeWavFile(filePath: string, pcmChunks: Buffer[], sampleRate = 16000): void {
  console.time("[Timing] Write WAV");
  const pcmData = Buffer.concat(pcmChunks);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);

  fs.writeFileSync(filePath, Buffer.concat([header, pcmData]));
}

/**
 * Builds a natural, command-specific spoken response instead of a
 * generic "Done." — e.g. WhatsApp says who the message went to,
 * clipboard reads out its contents, YouTube/maps searches confirm
 * what was searched, etc.
 */
function buildSpokenResponse(result: any): string {
  if (!result?.success) {
    if (result?.error === "EVENT_NOT_FOUND") {
      return "I couldn't find that event on your calendar.";
    }
    if (result?.error === "MISSING_CREATE_FIELDS" || result?.error === "MISSING_EDIT_FIELDS") {
      return "I need a bit more detail — like the event name and date — to do that.";
    }
    if (result?.error === "NO_VIDEO_FOUND") {
      return "I couldn't find that video on YouTube.";
    }
    return "Sorry, that didn't work.";
  }

  const command = result?.command as string | undefined;
  const data = result?.data as Record<string, unknown> | undefined;

  switch (command) {
    case "whatsapp": {
      if (data?.status === "typed-awaiting-review") {
        return `I've typed a message to ${data.contact} saying "${data.message}". Should I proceed and send it, or is something wrong with the contact or the message? if so just say change the message or change the contact with your updated message and contact`;
      }
      if (data?.status === "sent") {
        return `Message sent to ${data.contact} on WhatsApp.`;
      }
      if (data?.status === "calling" || data?.status === "video-calling") {
        return `Calling ${data.contact} on WhatsApp.`;
      }
      return "WhatsApp opened.";
    }

    case "openApp": {
      const url = typeof data?.url === "string" ? data.url : "";
      if (url.includes("youtube.com/search")) {
        return "Searched this on YouTube. Here are the results.";
      }
      if (url.includes("youtube.com")) {
        return "Opened YouTube.";
      }
      if (url.includes("google.com/maps")) {
        return "Here's the location on the map.";
      }
      if (url) {
        return "Opened it in Chrome.";
      }
      return `Opened ${data?.target ?? "the app"}.`;
    }

    case "clipboard": {
      const text = typeof data?.text === "string" ? data.text.trim() : "";
      return text.length > 0
        ? `Here is your clipboard data: ${text}`
        : "Your clipboard is empty.";
    }

    case "screenshot":
      return "Screenshot taken.";

    case "battery": {
      const level = (data?.level ?? data?.percentage) as number | undefined;
      return level != null ? `Battery is at ${level} percent.` : "Battery status checked.";
    }

    case "volume":
      return "Volume adjusted.";

    case "brightness":
      return "Brightness adjusted.";

    case "notification":
      return "Notification sent.";

case "calendar": {
      const events = data?.events as { summary: string; start: string }[] | undefined;
      const range = (data?.range as string | undefined) ?? "";

      const rangeLabel =
        range === "today" ? "today" :
        range === "this-month" ? "this month" :
        range === "previous-month" ? "last month" :
        range ? `in ${range.charAt(0).toUpperCase() + range.slice(1)}` :
        "in that period";

      if (!events || events.length === 0) {
        return `You have no events ${rangeLabel}.`;
      }

      const list = events
        .map((e) => {
          const hasTime = e.start.includes("T");
          if (!hasTime) return e.summary;

          const date = new Date(e.start);
          const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          return `${e.summary} at ${timeStr}`;
        })
        .join(", ");

      return `You have ${events.length} event${events.length > 1 ? "s" : ""} ${rangeLabel}: ${list}.`;
    }

case "gmail": {
      const unreadCount = data?.unreadCount as number | undefined;
      const recentEmails = data?.recentEmails as { subject: string; from: string }[] | undefined;

      if (!recentEmails || recentEmails.length === 0) {
        return "You don't have any emails in your inbox.";
      }

      const unreadPart =
        unreadCount && unreadCount > 0
          ? `You have ${unreadCount} unread email${unreadCount > 1 ? "s" : ""}. `
          : "You have no unread emails. ";

      if (recentEmails.length === 1) {
        const e = recentEmails[0];
        return `${unreadPart}Your latest email is from ${e.from}, with the subject: ${e.subject}`;
      }

      const list = recentEmails
        .map((e, i) => `${i + 1}. From ${e.from}, subject: ${e.subject}`)
        .join(". ");

      return `${unreadPart}Here are your ${recentEmails.length} most recent emails: ${list}`;
    }

    case "youtubePlay": {
      return `Playing "${data?.query}" on YouTube.`;
    }
    case "time": {
  const iso = data?.time as string | undefined;

  if (!iso) {
    return "I couldn't determine the current date and time.";
  }

  const now = new Date(iso);

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `Today is ${date}, and the current time is ${time}.`;
}
    default:
      return "Done.";
  }
}

class VoicePipeline extends EventEmitter {
  private listening = false;

  start() {
    wakewordService.start();
    this.emit("state-change", "idle");

  wakewordService.on("wakeword-detected", async () => {
      if (this.listening) return;
      this.listening = true;
      wakewordService.pause();   // ← yeh line add karo

      try {
        console.log("🔊 Wake word detected — greeting...");
        this.emit("transcript", "Hey Nexus");
        this.emit("state-change", "greeting");

        try {
          await speak(GREETING_TEXT, "en");
        } catch (err) {
          console.warn("[TTS] Failed to speak greeting:", err);
        }
        this.emit("response", GREETING_TEXT);

        let turn = 0;
        let keepGoing = true;

        // Loop keeps going as long as there's an open WhatsApp
        // confirmation (or the user is being re-prompted after
        // silence), instead of returning to idle after one command.
        while (keepGoing && turn < MAX_CONVERSATION_TURNS) {
          turn++;

          console.log(`🎙️ Recording command (turn ${turn})...`);
          this.emit("state-change", "recording");
          console.time("[Timing] Recording");

          const chunks: Buffer[] = [];
          const unsubscribe = audioCaptureService.subscribe((chunk: Buffer) => {
            chunks.push(chunk);
          });

          await new Promise((resolve) => setTimeout(resolve, RECORDING_DURATION_MS));
          console.timeEnd("[Timing] Recording");
          unsubscribe();

          const wavFile = path.join(os.tmpdir(), `nexus-command-${Date.now()}.wav`);
          writeWavFile(wavFile, chunks);
          console.timeEnd("[Timing] Write WAV");

          this.emit("state-change", "thinking");
          console.time("[Timing] Speech-to-Text");

          const text = await speechRecognizerService.transcribe(wavFile);
          console.timeEnd("[Timing] Speech-to-Text");
          const pendingBefore = whatsappPending.get();

          if (!text || text.trim().length === 0) {
            console.warn("[VoicePipeline] Empty transcription.");

            if (pendingBefore) {
              const msg = "Sorry, I didn't hear anything. Could you repeat that?";
              this.emit("response", msg);
              await speak(msg, "en").catch(() => {});
              continue;
            }

            break;
          }

          console.log("[VoicePipeline] Transcribed:", text);
          this.emit("transcript", text);

          if (pendingBefore) {
            const { spokenText, done } = await handleWhatsAppPendingReply(text, pendingBefore);
            this.emit("response", spokenText);
            await speak(spokenText, "en").catch((err) =>
              console.warn("[TTS] Failed to speak pending reply:", err)
            );
            keepGoing = !done;
            continue;
          }
          console.time("[Timing] Tool Selection + Execution");
          const result: any = await routeCommand("brain", {
            text,
            source: "voice",
          });
          console.timeEnd("[Timing] Tool Selection + Execution");
          console.log("[VoicePipeline] Command result:", result);

          if (result?.type === "chat") {
            if (typeof result?.data === "string") {
              this.emit("response", result.data);
            }
            keepGoing = false;
          } else {
            const spokenText = buildSpokenResponse(result);
            this.emit("response", spokenText);
            await speak(spokenText, "en").catch((err) =>
              console.warn("[TTS] Failed to speak tool response:", err)
            );

            // If this command just started a WhatsApp confirmation,
            // keep the conversation going instead of going idle.
            keepGoing = whatsappPending.get() !== null;
          }
        }

        if (whatsappPending.get()) {
          const msg = "I'll leave that message unsent for now.";
          this.emit("response", msg);
          await speak(msg, "en").catch(() => {});
          whatsappPending.clear();
        }
      } catch (error) {
        console.error("[VoicePipeline] Error:", error);
      } finally {
        this.listening = false;
        whatsappPending.clear(); // safety net in case of an unexpected exit
        this.emit("state-change", "idle");
        wakewordService.resume();   // ← yeh line add karo
      }
    });
  }
}

export const voicePipeline = new VoicePipeline();