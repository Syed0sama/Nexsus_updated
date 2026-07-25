import { whatsAppService } from "../../services/whatsapp.service";
import { whatsappPending, type WhatsAppPendingState } from "./whatsapp-pending";
import { classifyWhatsAppCorrection } from "../../ai/core/brain";

// Heuristic keyword matching (English + Roman Urdu), consistent with
// the rest of the codebase's regex-based intent detection (see
// language-detector.ts, isQuestion() in brain.ts).

const CANCEL_RE = /\b(cancel|forget it|chhod ?do|rehne ?do|mat bhejo|band karo)\b/i;

export interface PendingReplyResult {
  spokenText: string;
  done: boolean; // true = conversation loop should stop (sent or cancelled)
}

export async function handleWhatsAppPendingReply(
  
  text: string,
  pending: WhatsAppPendingState
  
): Promise<PendingReplyResult> {
  const trimmed = text.trim();
  console.log("[WhatsApp Pending] Stage:", pending.stage);
console.log("[WhatsApp Pending] User said:", text);
if (CANCEL_RE.test(trimmed)) {
    await whatsAppService.clearDraft();
    whatsappPending.clear();
    return { spokenText: "Okay, I've cancelled that message.", done: true };
  }

  switch (pending.stage) {
case "awaiting-review": {
  console.log("[WhatsApp Pending] Entered awaiting-review");

  const result = await classifyWhatsAppCorrection(
    pending.contact,
    pending.message,
    trimmed
  );

  switch (result.action) {
    case "send":
      await whatsAppService.sendPendingEnter();
      whatsappPending.clear();

      return {
        spokenText: `Message sent to ${pending.contact} on WhatsApp.`,
        done: true,
      };

   case "cancel":
      await whatsAppService.clearDraft();
      whatsappPending.clear();

      return {
        spokenText: "Okay, I've cancelled the message.",
        done: true,
      };

    case "change_contact":
      await whatsAppService.typeMessage(
        result.contact,
        pending.message,
        false
      );

      whatsappPending.set({
        contact: result.contact,
        message: pending.message,
        stage: "awaiting-review",
      });

      return {
        spokenText: `I've changed the contact to ${result.contact}. Should I send it now?`,
        done: false,
      };

    case "change_message":
      await whatsAppService.retypeMessageOnly(
        result.message,
        false
      );

      whatsappPending.set({
        contact: pending.contact,
        message: result.message,
        stage: "awaiting-review",
      });

      return {
        spokenText: `I've updated the message to "${result.message}". Should I send it now?`,
        done: false,
      };

    case "both":
      await whatsAppService.typeMessage(
        result.contact,
        result.message,
        false
      );

      whatsappPending.set({
        contact: result.contact,
        message: result.message,
        stage: "awaiting-review",
      });

      return {
        spokenText: `I've changed the contact to ${result.contact} and updated the message to "${result.message}". Should I send it now?`,
        done: false,
      };

    default:
      return {
        spokenText: `Sorry, I couldn't understand. Should I send the message to ${pending.contact}, or would you like to change the contact or message?`,
        done: false,
      };
  }
}


 case "awaiting-new-contact": {
  const result = await classifyWhatsAppCorrection(
    pending.contact,
    pending.message,
    trimmed
  );

  const newContact =
    result.action === "change_contact"
      ? result.contact
      : result.action === "both"
      ? result.contact
      : trimmed;

  const newMessage =
    result.action === "both"
      ? result.message
      : pending.message;

  await whatsAppService.typeMessage(
    newContact,
    newMessage,
    false
  );

  whatsappPending.set({
    contact: newContact,
    message: newMessage,
    stage: "awaiting-review",
  });

  return {
    spokenText: `I've changed the contact to ${newContact}. Should I send it now?`,
    done: false,
  };
}

    case "awaiting-new-message": {
      const newMessage = trimmed;

      await whatsAppService.retypeMessageOnly(newMessage, false);

      const updated: WhatsAppPendingState = {
        contact: pending.contact,
        message: newMessage,
        stage: "awaiting-review",
      };
      whatsappPending.set(updated);

      return {
        spokenText: `Okay, I've updated the message to say "${newMessage}". Should I send it to ${pending.contact} now?`,
        done: false,
      };
    }
  }
}