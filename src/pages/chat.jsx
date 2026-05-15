import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAgentResponse } from "../services/geminiAiService";
import { speak } from "../services/ttsService";
import ChatInputBox from "../components/chatBox";
import FormattedMessage from "../components/Fromattedmessage";
import VoiceMessage from "../components/voiceMessage";
import { Sparkles, Cpu } from "lucide-react";

export default function Chat() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);

  // Media States
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const isChatStarted = messages.length > 0;

  // --- 1. FETCH AGENTS ---
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const snap = await getDocs(collection(db, "agents"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAgents(list);
        if (list.length > 0) setSelectedAgent(list[0]);
      } catch (err) {
        console.error("Agent Fetch Error:", err);
      }
    };
    fetchAgents();
  }, []);

  // --- 2. AUTO SCROLL ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- 3. VOICE LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioPreviewUrl(null);
  };

  // --- 4. IMAGE LOGIC ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageBase64(reader.result.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 5. SEND LOGIC ---
  const handleSend = async () => {
    if (loading) return;
    if ((!input.trim() && !audioBlob) || !selectedAgent) return;

    setLoading(true);
    let finalText = input;

    try {
      // 🎙️ USER VOICE → STT
      if (audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice.webm");

        const res = await fetch("http://localhost:8010/stt", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        finalText = data.text || "(Voice message)";

        setMessages((prev) => [
          ...prev,
          { role: "user", type: "voice", audioUrl: audioPreviewUrl },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "user", content: finalText }]);
      }

      // 🤖 AGENT RESPONSE (TEXT INTERNALLY)
      const response = await getAgentResponse(
        finalText,
        selectedAgent,
        messages.slice(-5),
      );

      // 📝 TEXT MODE
      if (!voiceEnabled) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response },
        ]);
      }

      // 🔊 VOICE MODE → SEND VOICE NOTE ONLY
      if (voiceEnabled) {
        const voiceUrl = await speak(response, selectedAgent.voiceProfile);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            type: "voice",
            audioUrl: voiceUrl,
          },
        ]);
      }

      setInput("");
      clearAudio();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "Error: " + e.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden">
      {/* --- A. MESSAGE STREAM --- */}
      {isChatStarted && (
        <div className="flex-1 overflow-y-auto px-4 pt-10 pb-40 no-scrollbar animate-in fade-in duration-500">
          <div className="space-y-10 max-w-3xl mx-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-2`}
              >
                <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-mono">
                  {m.role === "user" ? "You" : selectedAgent?.name}
                </span>

                {/* FIX APPLIED HERE: caret-transparent + outline-none */}
                <div
                  className={`max-w-[85%] py-3 px-4 text-sm border 
                    caret-transparent outline-none cursor-default
                    ${
                      m.role === "user"
                        ? "bg-neutral-900 border-neutral-800 rounded-2xl"
                        : "border-transparent border-l-neutral-800 border-l-2 pl-4 text-neutral-300"
                    }`}
                >
                  {m.imagePreview && (
                    <img
                      src={m.imagePreview}
                      className="mb-3 rounded-xl max-w-xs border border-neutral-800"
                      alt="Upload"
                    />
                  )}
                  {m.type === "voice" && (
                    <div className="mb-2">
                      <VoiceMessage src={m.audioUrl} />
                    </div>
                  )}
                  <FormattedMessage text={m.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 animate-pulse text-emerald-500 text-[10px] uppercase tracking-widest pl-1">
                <Cpu size={14} /> Processing
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* --- B. INPUT CONTAINER --- */}
      <div
        className={`absolute inset-0 flex flex-col items-center px-4 transition-all duration-700 ease-in-out pointer-events-none 
          ${isChatStarted ? "justify-end pb-6" : "justify-center gap-6"}`}
      >
        {!isChatStarted && (
          <div className="text-center space-y-4 animate-in fade-in zoom-in duration-700">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl backdrop-blur-sm">
              <Sparkles size={24} className="text-white opacity-80" />
            </div>
            <h1 className="text-3xl font-light text-neutral-200 tracking-tight">
              How can I help <span className="text-neutral-500">you?</span>
            </h1>
          </div>
        )}

        <div className="w-full max-w-3xl pointer-events-auto">
          <ChatInputBox
            {...{
              input,
              setInput,
              textareaRef,
              isRecording,
              startRecording,
              stopRecording,
              audioPreviewUrl,
              clearAudio,
              imagePreview,
              setImagePreview,
              handleImageUpload,
              fileInputRef,
              handleSend,
              loading,
              agents,
              selectedAgent,
              setSelectedAgent,
              showAgentMenu,
              setShowAgentMenu,
              setMessages,
              voiceEnabled,
              setVoiceEnabled,
            }}
          />
        </div>
      </div>
    </div>
  );
}
