import  { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyChw8Z4L1tJMDc74MAglhu-eFGjfCm2yqQ" });

const WhatsAppVoice = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // 1. Logic to Toggle Start/Stop
  const toggleRecording = async () => {
    if (isRecording) {
      // STOP: This will trigger the 'onstop' event below
      mediaRecorder.current?.stop();
      setIsRecording(false);
    } else {
      // START
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        sendToGemini(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    }
  };

  // 2. Logic to Send to Gemini
  const sendToGemini = async (blob: Blob) => {
    setLoading(true);
    try {
      const base64 = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string)?.split(',')[1] ?? null);
        reader.readAsDataURL(blob);
      });

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
      systemInstruction: 
"You are primarily a compassionate comforter and safety advocate for those facing distress or violence in Nigeria. Your first priority is to provide deep emotional validation and warmth, acting as a 'safe harbor' for the user. Only mention the VAPP Act 2015 if specifically asked or if essential to explain a protective right (like the right to stay in one’s home). Focus on providing short, soothing responses that offer practical safety tips—such as digital privacy, emergency contacts (112 or NAPTIP), and finding local support—rather than legal citations. Always lead with empathy, keep the advice brief and actionable, and never use a formal or 'lawyer-like' tone unless the user requests technical legal details."
    },
        contents: [
          ({
            parts: [
              { text: "Briefly respond to this voice note." },
              { inlineData: { mimeType: "audio/webm", data: base64 } }
            ]
          } as any)
        ]
      });
      setAiText((result as any)?.text ?? "");
    } catch (err) {
      setAiText("Error: Check your API key or Billing.");
    }
    setLoading(false);
  };

  return (
    <div className=" fixed flex flex-col items-center justify-center min-h-screen bg-emerald-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm flex flex-col items-center">
        
        <h2 className="text-emerald-800 font-bold mb-8 uppercase tracking-widest text-sm">Gemini Voice</h2>

        {/* The One Toggle Button */}
        <button
          onClick={toggleRecording}
          disabled={loading}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-lg 
            ${isRecording ? 'bg-red-500 scale-110' : 'bg-primaryy hover:scale-105 active:scale-95'}`}
        >
          {/* Pulse Animation when recording */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
          )}
          
          {/* Icon (Mic or Stop) */}
          <span className="relative text-white text-4xl">
            {isRecording ? "⏹" : "🎤"}
          </span>
        </button>

        <p className="mt-4 text-emerald-600 font-medium">
          {loading ? "Gemini is listening..." : isRecording ? "Recording... Click to Send" : "Click to Record"}
        </p>

        {/* Display Response */}
        {aiText && (
          <div className="mt-8 p-4 bg-primaryy rounded-2xl text-emerald-900 text-sm border-l-4 border-emerald-500 overflow-y-scroll w-full">
            <strong>Avant:</strong> {aiText}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppVoice;