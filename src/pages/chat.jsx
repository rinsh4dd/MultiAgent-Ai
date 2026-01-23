import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAgentResponse } from "../services/geminiAiService";
import { 
  Send, Bot, Sparkles, ChevronDown, Cpu, Circle, 
  Mic, Image as ImageIcon, X, Share2 
} from "lucide-react";

// --- SPEECH HOOK ---
const useSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) return;
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalString = "";
      let interimString = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalString += event.results[i][0].transcript;
        else interimString += event.results[i][0].transcript;
      }
      if (finalString || interimString) setLiveTranscript(finalString + interimString);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setLiveTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, liveTranscript, startListening, stopListening };
};

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

const AgentBadge = ({ agent, onClick, isOpen }) => (
  <button onClick={onClick} className="group flex items-center gap-2 pr-3 pl-2 py-1.5 rounded-md hover:bg-neutral-900 transition-all border-r border-neutral-800">
    <div className="relative">
      <Bot size={16} strokeWidth={1.5} className="text-neutral-500 group-hover:text-white transition-colors" />
      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
    </div>
    <div className="flex flex-col items-start">
      <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-300 group-hover:text-white">{agent ? agent.name : "Select Agent"}</span>
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
  const [baseInput, setBaseInput] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null); // Ref for dynamic height

  // Media
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Hooks
  const { isListening, liveTranscript, startListening, stopListening } = useSpeechToText();

  useEffect(() => {
    const fetchAgents = async () => {
      const snap = await getDocs(collection(db, "agents"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAgents(list);
      if (list.length > 0) setSelectedAgent(list[0]);
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- AUTO-RESIZE INPUT LOGIC ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset to calculate new height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scrollHeight
    }
  }, [input]);

  useEffect(() => {
    if (isListening) {
      const separator = baseInput && liveTranscript ? " " : "";
      setInput(baseInput + separator + liveTranscript);
    }
  }, [liveTranscript, isListening, baseInput]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setBaseInput(input);
    } else {
      setBaseInput(input);
      startListening();
    }
  };

  const handleShare = async () => {
    const lastMessage = [...messages].reverse().find(m => m.role === "assistant");
    if (lastMessage && navigator.share) {
      try {
        await navigator.share({ title: `Chat with ${selectedAgent?.name || 'AI'}`, text: lastMessage.content });
      } catch (err) { console.log("Share cancelled"); }
    } else if (lastMessage) {
        navigator.clipboard.writeText(lastMessage.content);
        alert("Copied to clipboard!");
    }
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

  const handleSend = async () => {
    if (loading) return;
    if ((!input.trim() && !imageBase64) || !selectedAgent) return;
    if (isListening) stopListening();

    const userText = input;
    setInput(""); 
    setBaseInput("");
    setImageBase64(null);
    setImagePreview(null);
    
    // Reset height immediately after send
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const newUserMessage = { role: "user", content: userText, imagePreview: imagePreview };
    const updatedMessages = [...messages, newUserMessage];
    const trimmedMessages = updatedMessages.slice(-5);

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await getAgentResponse(
        userText,
        selectedAgent,
        trimmedMessages,
        null, 
        imageBase64
      );
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "system", content: "Error: " + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-neutral-200 font-sans w-full max-w-5xl mx-auto relative">
      <style>{`
        @keyframes vibrate {
          0% { transform: translate(0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(0); }
          75% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        .animate-vibrate { animation: vibrate 0.2s linear infinite; }
      `}</style>

      {/* 1. CHAT STREAM */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30 select-none">
            <div className="relative">
              <Sparkles size={48} strokeWidth={1} />
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="font-light text-sm uppercase tracking-[0.3em]">System Ready</p>
              <p className="text-xs font-mono text-neutral-500">{selectedAgent ? `Connected to: ${selectedAgent.name}` : "Select an agent"}</p>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
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
                {m.imagePreview && (
                   <img src={m.imagePreview} alt="Upload" className="mb-2 max-w-[200px] rounded-lg border border-neutral-700" />
                )}
                {m.role === "user" || m.role === "system" ? m.content : <FormattedMessage text={m.content} />}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-3 pl-1 animate-pulse opacity-60">
            <Cpu size={14} className="text-emerald-500" />
            <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Processing</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 2. INPUT AREA */}
      <div className="p-6 bg-black sticky bottom-0 z-30">
        <div className="relative max-w-3xl mx-auto">
          {imagePreview && (
            <div className="absolute bottom-full left-0 mb-2 relative group">
              <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-neutral-700" />
              <button onClick={() => { setImageBase64(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-neutral-800 rounded-full p-1 text-white border border-neutral-700 hover:bg-red-900">
                <X size={12} />
              </button>
            </div>
          )}

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

          <div className={`
             flex items-end gap-2 bg-neutral-950 border rounded-xl p-1.5 pl-2 shadow-2xl transition-all duration-300
             ${isListening ? "border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-neutral-800"}
          `}>
            
            <div className="pb-2"> {/* Align badge to bottom if text grows */}
               <AgentBadge agent={selectedAgent} isOpen={showAgentMenu} onClick={() => setShowAgentMenu(!showAgentMenu)} />
            </div>
            
            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 bg-transparent text-white text-sm font-light px-2 py-3 outline-none placeholder:text-neutral-700 resize-none max-h-32 min-h-[40px] overflow-y-auto scrollbar-hide"
              placeholder={isListening ? "Listening..." : "Message..."}
              value={input}
              onChange={(e) => {
                 if (isListening) stopListening();
                 setInput(e.target.value);
                 setBaseInput(e.target.value);
              }}
              onKeyDown={(e) => { 
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                    e.preventDefault(); // Prevent default new line
                    handleSend(); 
                }
              }}
              disabled={loading} 
            />

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-1 pr-1 shrink-0 pb-1"> {/* Align buttons to bottom */}
              
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              
              <button onClick={() => fileInputRef.current.click()} className={`p-2 rounded-lg transition-colors hover:bg-neutral-800 ${imageBase64 ? "text-emerald-500" : "text-neutral-500"}`} title="Upload Image">
                <ImageIcon size={18} strokeWidth={1.5} />
              </button>

              <button onClick={handleShare} className="p-2 rounded-lg transition-colors hover:bg-neutral-800 text-neutral-500" title="Share Last Response">
                <Share2 size={18} strokeWidth={1.5} />
              </button>

              <button 
                onClick={handleMicClick} 
                className={`
                  p-2 rounded-lg transition-all duration-200 flex items-center justify-center w-10 h-10
                  ${isListening ? "bg-red-500/20 text-red-500 animate-vibrate" : "hover:bg-neutral-800 text-neutral-500"}
                `}
              >
                <Mic size={18} strokeWidth={isListening ? 2.5 : 1.5} />
              </button>

              <button onClick={handleSend} disabled={(!input.trim() && !imageBase64) || loading} className={`p-2 rounded-lg transition-all duration-300 ml-1 ${(!input.trim() && !imageBase64) || loading ? "opacity-20 cursor-not-allowed" : "bg-white text-black hover:scale-105"}`}>
                <Send size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
          
          <p className="text-center text-[9px] text-neutral-700 mt-3 font-mono tracking-wide">
             Gemini 2.5 Flash // {isListening ? <span className="text-emerald-500 animate-pulse font-bold">LISTENING...</span> : "Ready"}
          </p>
        </div>
      </div>
    </div>
  );
}