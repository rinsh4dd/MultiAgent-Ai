import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAgentResponse } from "../services/geminiAiService";
import { 
  Send, Bot, Sparkles, ChevronDown, Cpu, Circle, 
  Mic, Image as ImageIcon, X
} from "lucide-react";

// --- HELPER COMPONENTS ---
const FormattedMessage = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <div className="text-sm font-light leading-relaxed whitespace-pre-wrap text-neutral-300">
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index} className="text-white font-medium">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </div>
  );
};

// --- RESPONSIVE AGENT BADGE ---
const AgentBadge = ({ agent, onClick, isOpen }) => (
  <button onClick={onClick} className="group flex items-center gap-2 pr-2 pl-2 py-1.5 rounded-md hover:bg-neutral-900 transition-all border-r border-neutral-800 shrink-0">
    <div className="relative">
      <Bot size={18} strokeWidth={1.5} className="text-neutral-500 group-hover:text-white transition-colors" />
      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
    </div>
    <div className="flex-col items-start hidden sm:flex"> 
      <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-300 group-hover:text-white">{agent ? agent.name : "Select"}</span>
    </div>
    <ChevronDown size={12} className={`text-neutral-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
  </button>
);

// --- MAIN COMPONENT ---
export default function Chat() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null); 
  const fileInputRef = useRef(null);

  // --- MEDIA / RECORDING STATE ---
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Voice State
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  const isChatStarted = messages.length > 0;

  // --- 1. FETCH AGENTS ---
  useEffect(() => {
    const fetchAgents = async () => {
      const snap = await getDocs(collection(db, "agents"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAgents(list);
      if (list.length > 0) setSelectedAgent(list[0]);
    };
    fetchAgents();
  }, []);

  // --- 2. SCROLL & RESIZE ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; 
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; 
    }
  }, [input]);

  // --- 3. VOICE RECORDING LOGIC (Browser API) ---
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
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone.");
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


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result.split(',')[1]);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 5. SEND LOGIC (Includes STT Upload) ---
  const handleSend = async () => {
    if (loading) return;
    if ((!input.trim() && !imageBase64 && !audioBlob) || !selectedAgent) return;

    setLoading(true);
    
    // Prepare User Message Data
    let finalText = input;
    let userMsgObject = { role: "user", content: input, imagePreview: imagePreview };

    try {
        // A. Handle Voice Upload (Local Python STT)
        if (audioBlob) {
            const formData = new FormData();
            formData.append("audio", audioBlob, "voice.webm"); 

            // 🚀 Pointing to LOCALHOST Python Server
            const res = await fetch("http://localhost:8000/stt", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Local Whisper API Failed");

            const data = await res.json();
            finalText = data.text || "(Audio Message)"; 
            
            userMsgObject = { 
                role: "user", 
                type: "voice", 
                audioUrl: audioPreviewUrl, 
                content: finalText 
            };
            
            setAudioBlob(null);
            setAudioPreviewUrl(null);
        }

        // B. Clear Inputs
        setInput(""); 
        setImageBase64(null);
        setImagePreview(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        // C. Update Chat History
        const newMessages = [...messages, userMsgObject];
        setMessages(newMessages);

        // D. Get AI Response (Groq)
        const response = await getAgentResponse(
            finalText,
            selectedAgent,
            newMessages.slice(-5),
            null, 
            imageBase64
        );

        setMessages((prev) => [...prev, { role: "assistant", content: response }]);

    } catch (e) {
        console.error(e);
        setMessages((prev) => [...prev, { role: "system", content: "Error: " + e.message }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-neutral-200 font-sans w-full max-w-5xl mx-auto relative">
      
      {/* 1. CHAT STREAM */}
      <div className={`
        flex-1 overflow-y-auto px-4 md:px-6 pt-8 pb-44 space-y-10 no-scrollbar transition-all duration-500
        ${isChatStarted ? "opacity-100" : "opacity-0"} 
      `}>
        {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-2`}>
              <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-mono px-1">
                {m.role === "user" ? "You" : selectedAgent?.name || "Agent"}
              </span>
              <div className={`
                max-w-[85%] md:max-w-[70%] py-3 px-4 text-sm font-light border backdrop-blur-sm
                ${m.role === "user" 
                  ? "bg-neutral-900/50 border-neutral-800 text-white rounded-2xl rounded-tr-sm" 
                  : "bg-transparent border-transparent text-neutral-300 pl-0 border-l-2 border-l-neutral-800 rounded-r-xl"
                }
              `}>
                {/* Image Display */}
                {m.imagePreview && (
                   <img src={m.imagePreview} alt="Upload" className="mb-2 max-w-[200px] rounded-lg border border-neutral-700" />
                )}
                
                {/* Audio Display */}
                {m.type === "voice" && m.audioUrl && (
                    <div className="mb-2 flex items-center gap-2">
                        <audio controls src={m.audioUrl} className="h-8 w-48" />
                    </div>
                )}

                {/* Text Display */}
                {m.role === "user" || m.role === "system" ? m.content : <FormattedMessage text={m.content} />}
              </div>
            </div>
          ))}

        {loading && (
          <div className="flex items-center gap-3 pl-1 animate-pulse opacity-60">
            <Cpu size={14} className="text-emerald-500" />
            <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Processing</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 2. DYNAMIC INPUT AREA */}
      <div className={`
        absolute left-0 right-0 p-4 transition-all duration-700 ease-in-out flex flex-col items-center justify-center z-30
        ${isChatStarted ? "bottom-0 bg-transparent" : "top-0 bottom-0 bg-black"}
      `}>
        
        {/* Welcome Message */}
        {!isChatStarted && (
           <div className="text-center space-y-4 mb-8 animate-in fade-in zoom-in duration-700">
             <div className="relative inline-block">
                <Sparkles size={48} strokeWidth={1} className="text-white mx-auto" />
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse"></div>
             </div>
             <p className="font-light text-2xl text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500">
               How can I help you today?
             </p>
           </div>
        )}

        {/* INPUT CONTAINER */}
        <div className="relative w-full max-w-3xl mx-auto">
          
          {/* PREVIEWS (Image or Audio) */}
          <div className="flex gap-2 absolute bottom-full left-0 mb-2">
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative group">
                  <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-neutral-700" />
                  <button onClick={() => { setImageBase64(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-neutral-800 rounded-full p-1 text-white border border-neutral-700 hover:bg-red-900">
                    <X size={12} />
                  </button>
                </div>
              )}
              {/* Audio Recording Preview */}
              {audioPreviewUrl && (
                  <div className="relative group flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-2 pr-8">
                      <audio controls src={audioPreviewUrl} className="h-8 w-40" />
                      <button onClick={clearAudio} className="absolute -top-2 -right-2 bg-neutral-800 rounded-full p-1 text-white border border-neutral-700 hover:bg-red-900">
                        <X size={12} />
                      </button>
                  </div>
              )}
          </div>

          {/* AGENT MENU */}
          {showAgentMenu && (
            <div className="absolute bottom-full left-0 mb-4 w-64 bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-3 py-2 border-b border-neutral-900">
                <span className="text-[10px] font-bold uppercase text-neutral-600 tracking-wider">Available Models</span>
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                {agents.map((agent) => (
                  <button key={agent.id} onClick={() => { setSelectedAgent(agent); setShowAgentMenu(false); setMessages([]); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-left ${selectedAgent?.id === agent.id ? "bg-neutral-900" : "hover:bg-neutral-900/50"}`}>
                    <Circle size={6} className={selectedAgent?.id === agent.id ? "fill-emerald-500 text-emerald-500" : "text-neutral-700"} />
                    <div>
                      <p className="text-xs font-medium text-neutral-200">{agent.name}</p>
                      <p className="text-[9px] text-neutral-500 font-mono uppercase truncate w-32">{agent.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* THE INPUT BOX CARD */}
          <div className={`
             flex flex-col gap-2 bg-neutral-950 border rounded-2xl p-3 shadow-2xl transition-all duration-300
             ${isRecording ? "border-red-500/50 ring-1 ring-red-500/20" : "border-neutral-800"}
          `}>
            
            {/* TOP ROW: TEXT AREA */}
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full bg-transparent text-white text-base font-light px-2 outline-none placeholder:text-neutral-600 resize-none max-h-48 min-h-[24px] overflow-y-auto scrollbar-hide"
              placeholder={isRecording ? "Recording audio..." : "Message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                    e.preventDefault(); 
                    handleSend(); 
                }
              }}
              disabled={loading || isRecording} 
            />

            {/* BOTTOM ROW: TOOLS & SEND */}
            <div className="flex items-center justify-between pt-1">
               {/* Left: Badge */}
               <AgentBadge agent={selectedAgent} isOpen={showAgentMenu} onClick={() => setShowAgentMenu(!showAgentMenu)} />

               {/* Right: Actions */}
               <div className="flex items-center gap-1">
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  
                  <button onClick={() => fileInputRef.current.click()} className={`p-2 rounded-lg transition-colors hover:bg-neutral-900 ${imageBase64 ? "text-emerald-500" : "text-neutral-500"}`} title="Upload Image">
                    <ImageIcon size={18} strokeWidth={1.5} />
                  </button>

              

                  {/* RECORDING BUTTON */}
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`
                      p-2 rounded-lg transition-all duration-200 flex items-center justify-center w-10 h-10
                      ${isRecording ? "bg-red-500/20 text-red-500" : "hover:bg-neutral-900 text-neutral-500"}
                    `}
                  >
                    <Mic size={18} strokeWidth={isRecording ? 2.5 : 1.5} />
                  </button>

                  <button onClick={handleSend} disabled={(!input.trim() && !imageBase64 && !audioBlob) || loading || isRecording} className={`p-2 rounded-lg transition-all duration-300 ml-1 ${(!input.trim() && !imageBase64 && !audioBlob) || loading || isRecording ? "opacity-20 cursor-not-allowed" : "bg-white text-black hover:scale-105"}`}>
                    <Send size={16} strokeWidth={2} />
                  </button>
               </div>
            </div>
          </div>
          
          {/* TEXT REMOVED HERE */}
        </div>
      </div>
    </div>
  );
}