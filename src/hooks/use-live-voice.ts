import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import {
  createAudioPlayer,
  startMicStream,
  type AudioPlayer,
  type MicStream,
} from "@/lib/audio";
import { LIVE_SYSTEM_INSTRUCTION } from "@/lib/prompts";

const LIVE_MODEL = "gemini-3.1-flash-live-preview";

export type LiveStatus = "idle" | "connecting" | "listening" | "speaking" | "error";

export interface LiveTurn {
  role: "user" | "model";
  text: string;
}

export interface UseLiveVoice {
  status: LiveStatus;
  error: string | null;
  /** Live captions for the current turn. Completed turns go to onTurn. */
  caption: LiveTurn | null;
  isMuted: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => void;
}

/**
 * Opens a bidirectional Live API session from the browser. Audio streams
 * straight to Gemini over a WebSocket rather than through any server of ours.
 *
 * onTurn fires once per completed exchange so the caller can persist it
 * alongside the typed messages.
 */
export function useLiveVoice(onTurn: (turn: LiveTurn) => void): UseLiveVoice {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState<LiveTurn | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const micRef = useRef<MicStream | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const mutedRef = useRef(false);

  const inputBufferRef = useRef("");
  const outputBufferRef = useRef("");
  const onTurnRef = useRef(onTurn);

  useEffect(() => {
    onTurnRef.current = onTurn;
  }, [onTurn]);

  const teardown = useCallback(async () => {
    await micRef.current?.stop().catch(() => undefined);
    micRef.current = null;

    await playerRef.current?.close().catch(() => undefined);
    playerRef.current = null;

    try {
      sessionRef.current?.close();
    } catch {
      // Socket already gone.
    }
    sessionRef.current = null;

    inputBufferRef.current = "";
    outputBufferRef.current = "";
    setCaption(null);
  }, []);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  const handleMessage = useCallback((message: LiveServerMessage) => {
    const content = message.serverContent;
    if (!content) return;

    // Barge-in: the person started talking, so drop whatever is still queued.
    if (content.interrupted) {
      playerRef.current?.clear();
      setStatus("listening");
    }

    if (content.inputTranscription?.text) {
      inputBufferRef.current += content.inputTranscription.text;
      setCaption({ role: "user", text: inputBufferRef.current });
    }

    if (content.outputTranscription?.text) {
      outputBufferRef.current += content.outputTranscription.text;
      setCaption({ role: "model", text: outputBufferRef.current });
    }

    for (const part of content.modelTurn?.parts ?? []) {
      const audio = part.inlineData?.data;
      if (!audio) continue;
      setStatus("speaking");
      if (!mutedRef.current) playerRef.current?.enqueue(audio);
    }

    if (content.turnComplete) {
      const spoken = inputBufferRef.current.trim();
      const replied = outputBufferRef.current.trim();
      inputBufferRef.current = "";
      outputBufferRef.current = "";

      if (spoken) onTurnRef.current({ role: "user", text: spoken });
      if (replied) onTurnRef.current({ role: "model", text: replied });

      setCaption(null);
      setStatus("listening");
    }
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current) return;

    setError(null);
    setStatus("connecting");

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
      playerRef.current = createAudioPlayer();

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: LIVE_SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => setStatus("listening"),
          onmessage: handleMessage,
          onerror: () => {
            setError("The call dropped. You can go back to typing any time.");
            setStatus("error");
          },
          onclose: () => setStatus("idle"),
        },
      });
      sessionRef.current = session;

      micRef.current = await startMicStream((chunk) => {
        sessionRef.current?.sendRealtimeInput({
          audio: { data: chunk, mimeType: "audio/pcm;rate=16000" },
        });
      });
    } catch {
      await teardown();
      setError("Could not start the call. You can go back to typing any time.");
      setStatus("error");
    }
  }, [handleMessage, teardown]);

  const disconnect = useCallback(async () => {
    await teardown();
    mutedRef.current = false;
    setIsMuted(false);
    setStatus("idle");
  }, [teardown]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) playerRef.current?.clear();
    setIsMuted(mutedRef.current);
  }, []);

  return { status, error, caption, isMuted, connect, disconnect, toggleMute };
}
