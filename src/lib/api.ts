import type { Part } from "@google/genai";

/**
 * Talks to our own Express server instead of Gemini directly, so the API key
 * stays server-side. Empty string means "same origin" (relative /api/... —
 * see vite.config.ts's dev proxy, or a reverse proxy in production).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ChatHistoryTurn {
  role: string;
  parts: { text: string }[];
}

export interface SendChatMessageParams {
  history: ChatHistoryTurn[];
  message: string | Part[];
  systemInstruction: string;
  model?: string;
}

export async function sendChatMessage(params: SendChatMessageParams): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text ?? "";
}

/** Fetches a short-lived token the browser can use to open a Live API session directly. */
export async function fetchLiveToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/live-token`, { method: "POST" });

  if (!response.ok) {
    throw new Error(`Live token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new Error("Server did not return a live token");
  return data.token;
}
