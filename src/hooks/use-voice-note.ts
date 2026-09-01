import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMimeType, toWavBlob } from "@/lib/audio";

export interface VoiceNoteClip {
  /** 16 kHz mono WAV, ready to hand to Gemini. */
  blob: Blob;
  durationSeconds: number;
}

export interface UseVoiceNote {
  isRecording: boolean;
  elapsedSeconds: number;
  error: string | null;
  start: () => Promise<void>;
  /** Resolves with the clip, or null if it was cancelled or empty. */
  stop: () => Promise<VoiceNoteClip | null>;
  cancel: () => void;
}

/**
 * Records one clip with MediaRecorder. Nothing leaves the device until the
 * person taps send, so a half-finished thought can still be thrown away.
 */
export function useVoiceNote(): UseVoiceNote {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const discardedRef = useRef(false);

  const teardown = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    discardedRef.current = false;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      teardown();
      setError("Microphone access was blocked. You can keep typing instead.");
    }
  }, [teardown]);

  const stop = useCallback(
    () =>
      new Promise<VoiceNoteClip | null>((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          teardown();
          resolve(null);
          return;
        }

        const durationSeconds = (Date.now() - startedAtRef.current) / 1000;

        recorder.onstop = () => {
          const wasDiscarded = discardedRef.current;
          const chunks = chunksRef.current;
          chunksRef.current = [];
          teardown();

          if (wasDiscarded || chunks.length === 0) {
            resolve(null);
            return;
          }

          const recorded = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });

          toWavBlob(recorded)
            .then((blob) => resolve({ blob, durationSeconds }))
            .catch(() => {
              setError("That clip could not be prepared. You can keep typing instead.");
              resolve(null);
            });
        };

        recorder.stop();
      }),
    [teardown]
  );

  const cancel = useCallback(() => {
    discardedRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    chunksRef.current = [];
    teardown();
  }, [teardown]);

  return { isRecording, elapsedSeconds, error, start, stop, cancel };
}
