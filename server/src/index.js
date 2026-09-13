import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim());

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set. Copy server/.env.example to server/.env and fill it in.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const app = express();
app.use(cors({ origin: CORS_ORIGIN ?? "*" }));
app.use(express.json({ limit: "15mb" })); // voice notes are sent as base64 audio

/**
 * Runs one turn of the text/voice-note chat server-side, so the API key never
 * reaches the browser. Mirrors what the frontend used to do with its own
 * GoogleGenAI client.
 */
app.post("/api/chat", async (req, res) => {
  const { history, message, systemInstruction, model } = req.body ?? {};

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const chat = ai.chats.create({
      model: model || "gemini-2.5-flash",
      config: systemInstruction ? { systemInstruction } : undefined,
      history: history ?? [],
    });

    const result = await chat.sendMessage({ message });
    res.json({ text: result.text ?? "" });
  } catch (error) {
    console.error("Gemini chat error:", error);
    res.status(502).json({ error: "Gemini request failed" });
  }
});

/**
 * The Live API needs a direct browser<->Gemini WebSocket for latency, so it
 * can't be proxied like /api/chat. Instead we mint a short-lived ephemeral
 * token here with the real key, and the browser uses that token (never the
 * real key) to open the Live session.
 */
app.post("/api/live-token", async (_req, res) => {
  try {
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
      },
    });
    res.json({ token: token.name });
  } catch (error) {
    console.error("Gemini live token error:", error);
    res.status(502).json({ error: "Could not create live token" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Avant API server listening on port ${PORT}`);
});
