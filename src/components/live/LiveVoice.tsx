import { useCallback, useEffect, useRef } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useLiveVoice, type LiveTurn, type LiveStatus } from "@/hooks/use-live-voice";
import "./live.css";

const STATUS_LABEL: Record<LiveStatus, string> = {
  idle: "Ended",
  connecting: "Connecting…",
  listening: "Listening",
  speaking: "Speaking",
  error: "Call dropped",
};

interface LiveVoiceProps {
  uid: string;
  chatId: string;
  onClose: () => void;
}

/**
 * Full-screen call sheet. Completed turns are written into the same Firestore
 * collection as typed messages, so the transcript is there afterwards.
 */
const LiveVoice = ({ uid, chatId, onClose }: LiveVoiceProps) => {
  const persistTurn = useCallback(
    (turn: LiveTurn) => {
      const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
      void addDoc(messagesRef, {
        role: turn.role,
        text: turn.text,
        timestamp: serverTimestamp(),
      });
    },
    [chatId, uid]
  );

  const { status, error, caption, isMuted, connect, disconnect, toggleMute } =
    useLiveVoice(persistTurn);

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void connect();
  }, [connect]);

  const handleClose = useCallback(async () => {
    await disconnect();
    onClose();
  }, [disconnect, onClose]);

  return (
    <div className="live-sheet">
      <div className="flex flex-col items-center gap-4 pt-16">
        <span className={`live-orb ${status === "speaking" ? "is-active" : ""}`} />
        <h2 className="text-white font-semibold text-[20px]">Avant is here</h2>
        <p className="text-white/60 text-[14px]">{STATUS_LABEL[status]}</p>
      </div>

      <div className="live-caption">
        {caption && (
          <p
            className={`text-[15px] leading-[1.7] ${
              caption.role === "user" ? "text-white" : "text-white/70"
            }`}
          >
            {caption.text}
          </p>
        )}
        {error && <p className="text-[14px] text-pink-400">{error}</p>}
      </div>

      <div className="flex items-center justify-center gap-4 pb-10">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute Avant" : "Mute Avant"}
          className="w-14 h-14 rounded-full border border-white/20 text-white/70 hover:text-white transition-colors"
        >
          <i className={`fa-solid ${isMuted ? "fa-volume-xmark" : "fa-volume-high"}`}></i>
        </button>
        <button
          type="button"
          onClick={() => void handleClose()}
          className="px-6 h-14 rounded-full bg-white text-blackk font-semibold text-[15px]"
        >
          Back to typing
        </button>
      </div>
    </div>
  );
};

export default LiveVoice;
