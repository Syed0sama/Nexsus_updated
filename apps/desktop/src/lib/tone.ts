// src/lib/tone.ts
// Chimes now play via the main process (Windows Media Player, same
// mechanism as TTS) instead of the renderer's Web Audio API -- see
// electron/services/chime.service.ts for why.

export async function playListenTone() {
  window.nexus.playChime("listen");
}

export async function playResponseTone() {
  window.nexus.playChime("response");
}

export async function playDoneTone() {
  window.nexus.playChime("done");
}