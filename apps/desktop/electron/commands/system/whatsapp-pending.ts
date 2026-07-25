export type WhatsAppPendingStage =
  | "awaiting-review"
  | "awaiting-new-contact"
  | "awaiting-new-message";

export interface WhatsAppPendingState {
  contact: string;
  message: string;
  stage: WhatsAppPendingStage;
}

let pending: WhatsAppPendingState | null = null;

export const whatsappPending = {
  get(): WhatsAppPendingState | null {
    return pending;
  },
  set(state: WhatsAppPendingState | null) {
    pending = state;
  },
  clear() {
    pending = null;
  },
};