import { MyContext } from "@/MyContext";
 import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore"; 
 
import { GoogleGenAI, type Part } from "@google/genai";
import { useContext, useEffect, useState} from "react";
import { db } from "@/firebase";
import { useParams } from "react-router-dom";
import { useVoiceNote } from "@/hooks/use-voice-note";
import LiveVoice from "@/components/live/LiveVoice";
import { blobToBase64 } from "@/lib/audio";
import { SYSTEM_INSTRUCTION, VOICE_NOTE_PROMPT } from "@/lib/prompts";
import "@/components/live/live.css";


const formatDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};


const Footer = () => {
  const {chatId} = useParams();
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const voiceNote = useVoiceNote();

  const callNumber = () => {
     const confirmCall = window.confirm(
      "This will call emergency services (112). Continue?"
    );

    if (confirmCall) {
      window.location.href = "tel:112";
    }
  };



    const {prompt,setPrompt,user,messages,setMessages,loading,setLoading} = useContext(MyContext)!
    //const [loading, setLoading] = useState(false);
    //const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);

    
    // Debug: Check chatId

   


    useEffect(() => {

       console.log("Attempting to send message to room:", chatId); // DEBUG THIS
  if (!chatId) {
    alert("No Chat ID found! Are you on the right URL?");
    return;
  }
  if (!user?.uid || !chatId) return;

  // 1. Point to the specific messages for this room
  const messagesRef = collection(db, "users", user.uid, "chats", chatId, "messages");
  
  // 2. Order them by time so the conversation makes sense
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  // 3. This is the "Magic" connection
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const fetchedMessages = snapshot.docs.map(doc => ({
      id: doc.id,
      role: (doc.data() as { role: string; text: string }).role,
      text: (doc.data() as { role: string; text: string }).text,
    }));

    // 4. This is where the data finally enters your 'messages' state!
    setMessages(fetchedMessages);
  });

  // Cleanup: Stop listening if the user leaves the page
  return () => unsubscribe();
}, [chatId, user?.uid]);

  


const apiKey = import.meta.env.VITE_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * One path for every turn. Text sends a plain string, a voice note sends the
 * clip plus a prompt asking for the reply and a transcript.
 *
 * userText is what gets written to Firestore as the person's message. For a
 * voice note it is empty until Gemini transcribes the clip.
 */
async function sendTurn(parts: string | Part[], userText: string | null) {
  if (!chatId || !user?.uid) return;

  setLoading(true);

  const messagesRef = collection(db, "users", user.uid, "chats", chatId, "messages");

  // 1. SAVE USER MESSAGE FIRST when we already have the text (Listener will show it in UI instantly)
  if (userText) {
    await addDoc(messagesRef, {
      role: "user",
      text: userText,
      timestamp: serverTimestamp(),
    });
  }

  try {
    // 2. Form history from the state we already have
    const formattedHistory = messages.map(msg => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
        model: "gemini-2.5-flash", // Updated model name
         config: {
          systemInstruction: SYSTEM_INSTRUCTION
        },
      history: formattedHistory,
    });

    // 3. Get AI Response
    const result = await chat.sendMessage({message: parts,});
    const raw = result.text ?? "";

    console.log("AI Raw Response:", raw);

    // 4. A voice note comes back as the reply plus a TRANSCRIPT: line. Split it,
    //    save the transcript as the person's message, then save the reply.
    const [replyPart, transcriptPart] = raw.split(/^TRANSCRIPT:\s*/m);
    const aiResponse = replyPart.trim();

    if (!userText) {
      await addDoc(messagesRef, {
        role: "user",
        text: transcriptPart?.trim() || "Voice note",
        timestamp: serverTimestamp(),
      });
    }

    // 5. SAVE AI RESPONSE TO FIREBASE
    await addDoc(messagesRef, {
      role: "model",
      text: aiResponse,
      timestamp: serverTimestamp(),
    });

    console.log("AI Response:", aiResponse);

  } catch (error) {
    console.error("Chat Error:", error);
  } finally {
    setLoading(false);
  }
}

async function main() {
  if (!prompt || !chatId || !user?.uid) return;

  const userPrompt = prompt; // Store it before clearing
  setPrompt(""); // Clear input immediately for better UX

  await sendTurn(userPrompt, userPrompt);
}

/** Stops the recorder, converts to WAV, and sends the clip as this turn. */
async function sendVoiceNote() {
  const clip = await voiceNote.stop();
  if (!clip) return;

  const data = await blobToBase64(clip.blob);

  await sendTurn(
    [
      { inlineData: { mimeType: "audio/wav", data } },
      { text: VOICE_NOTE_PROMPT },
    ],
    null
  );
}

function toggleLive() {
  if (!chatId || !user?.uid) {
    alert("Open a chat before starting a call.");
    return;
  }
  setIsLiveOpen(true);
}


 


console.log(messages)


    return(
        <div className="fixed bottom-0 w-[90%] md:w-[80%]  m-auto">

            {/* From Uiverse.io by dorian_8749 */}
        <form onSubmit={(e) => { e.preventDefault(); main(); }}>
        <div className="md:p-4  min-w-full">
          <div className="relative">
            <div
              className="relative flex flex-col border border-white/10 rounded-xl bg-black"
            >
              <div className="overflow-y-auto">
                {voiceNote.isRecording ? (
                  <div className="w-full px-4 py-3 min-h-[80px] flex items-center gap-3 text-white">
                    <span className="live-recording-dot"></span>
                    <span className="text-sm">Recording {formatDuration(voiceNote.elapsedSeconds)}</span>
                    <button
                      className="ml-auto text-sm text-white/50 hover:text-white cursor-pointer"
                      type="button"
                      onClick={voiceNote.cancel}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <textarea
                    onChange={(e)=>setPrompt(e.target.value)}
                    value={prompt}
                    rows={3}
                    style={{ overflow: 'hidden', outline: 'none' }}
                    className="w-full px-4 py-3 resize-none bg-transparent border-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/50 align-top leading-normal min-h-[80px] text-white"
                    placeholder="Ask me anything..."
                  ></textarea>
                )}
              </div>
              <div className="h-14">
                <div
                  className="absolute left-3 right-3 bottom-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 cursor-pointer text-white/50 hover:text-white transition-colors rounded-lg border border-white/10 hover:border-white/20"
                      aria-label={voiceNote.isRecording ? "Send voice note" : "Record a voice note"}
                      type="button"
                      onClick={() => voiceNote.isRecording ? sendVoiceNote() : voiceNote.start()}
                      disabled={loading}
                    >
                      <i className={`fa-solid ${voiceNote.isRecording ? "fa-paper-plane" : "fa-microphone"} text-secondaryy `}></i>
                        
                    </button>
                    <button
                      className="p-2 cursor-pointer text-white/50 hover:text-white transition-colors rounded-lg border border-white/10 hover:border-white/20"
                      aria-label="Start a voice call"
                      type="button"
                      onClick={toggleLive}
                      disabled={loading || voiceNote.isRecording}
                    >
                      <i className="fa-solid fa-headset text-secondaryy"></i>
                    </button>
                    <a href="https://herstoryourstory.ng/">
                      <button
                        className="p-2 text-white/50 cursor-pointer hover:text-white transition-colors rounded-lg border border-white/10 hover:border-white/20"
                        aria-label="Attach web link"
                        type="button"
                      >
                        <svg
                          className="w-4 h-4 text-blue-500"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          strokeWidth="2"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 24 24"
                          height="16"
                          width="16"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle r="10" cy="12" cx="12"></circle>
                          <path
                            d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
                          ></path>
                          <path d="M2 12h20"></path>
                        </svg>
                      </button>
                    </a>
                    <button
                      className="p-2 text-white/50 cursor-pointer hover:text-white transition-colors rounded-lg border border-white/10 hover:border-white/20"
                      aria-label="Attach Figma link"
                      type="button"
                      onClick={callNumber}
                    >
                     <i className="fa-solid fa-phone text-pink-500"></i>
                    </button>
                  </div>
                  <button
                    className="p-2 transition-colors text-blue-500 hover:text-blue-600"
                    aria-label="Send message"
                    type="submit"
                    onClick={main}
                  >
                    <svg
                      className="w-6 h-6"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 24 24"
                      height="24"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle r="10" cy="12" cx="12"></circle>
                      <path d="m16 12-4-4-4 4"></path>
                      <path d="M12 16V8"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </form>

        {voiceNote.error && (
          <p className="px-4 pb-2 text-sm text-pink-500">{voiceNote.error}</p>
        )}

        {isLiveOpen && chatId && user?.uid && (
          <LiveVoice uid={user.uid} chatId={chatId} onClose={() => setIsLiveOpen(false)} />
        )}


        </div>
    )
}


export default Footer
