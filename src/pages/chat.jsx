import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAgentResponse } from "../services/grokAiService";
import {
  Send, Bot, Sparkles, ChevronDown, Cpu, Circle
} from "lucide-react";

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
  <button
    onClick={onClick}
    className="group flex items-center gap-2 pr-3 pl-2 py-1.5 rounded-md hover:bg-neutral-900 transition-all border-r border-neutral-800"
  >
    <div className="relative">
      <Bot size={16} strokeWidth={1.5} className="text-neutral-500 group-hover:text-white transition-colors" />
      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
    </div>
    <div className="flex flex-col items-start">
      <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-300 group-hover:text-white">
        {agent ? agent.name : "Select Agent"}
      </span>
    </div>
    <ChevronDown 
      size={12} 
      className={`text-neutral-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
    />
  </button>
);

export default function Chat() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Initial Fetch
  useEffect(() => {
    const fetchAgents = async () => {
      const snap = await getDocs(collection(db, "agents"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAgents(list);
      if (list.length > 0) setSelectedAgent(list[0]);
    };
    fetchAgents();
  }, []);

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

 const handleSend = async () => {
  if (!input.trim() || !selectedAgent) return;

  const userText = input;
  setInput("");

  const newUserMessage = { role: "user", content: userText };
  const updatedMessages = [...messages, newUserMessage];

  setMessages(updatedMessages);
  setLoading(true);

  try {
    const [response] = await Promise.all([
      getAgentResponse(userText, selectedAgent, messages),
      new Promise((r) => setTimeout(r, 800)),
    ]);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: response },
    ]);
  } catch (e) {
    setMessages((prev) => [
      ...prev,
      { role: "system", content: "Error: Connection interrupted." },
    ]);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-neutral-200 font-sans w-full max-w-5xl mx-auto relative">
      
      {/* --- 1. CHAT STREAM --- */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30 select-none">
            <div className="relative">
              <Sparkles size={48} strokeWidth={1} />
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full"></div>
            </div>
            <div className="text-center space-y-2">
              <p className="font-light text-sm uppercase tracking-[0.3em]">System Ready</p>
              <p className="text-xs font-mono text-neutral-500">
                {selectedAgent ? `Connected to: ${selectedAgent.name}` : "Select an agent to begin"}
              </p>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-2`}>
              
              {/* Message Meta (Name) */}
              <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-mono px-1">
                {m.role === "user" ? "You" : selectedAgent?.name || "Agent"}
              </span>

              {/* Message Bubble */}
              <div className={`
                max-w-[85%] md:max-w-[70%] py-3 px-4 text-sm font-light border backdrop-blur-sm
                ${m.role === "user" 
                  ? "bg-neutral-900/50 border-neutral-800 text-white rounded-2xl rounded-tr-sm" 
                  : "bg-transparent border-transparent text-neutral-300 pl-0 border-l-2 border-l-neutral-800 rounded-r-xl"
                }
              `}>
                {m.role === "user" ? m.content : <FormattedMessage text={m.content} />}
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

      <div className="p-6 bg-black sticky bottom-0 z-30">
        <div className="relative max-w-3xl mx-auto">
          
          {showAgentMenu && (
            <div className="absolute bottom-full left-0 mb-4 w-64 bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-3 py-2 border-b border-neutral-900">
                <span className="text-[10px] font-bold uppercase text-neutral-600 tracking-wider">Available Models</span>
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => { setSelectedAgent(agent); setShowAgentMenu(false); setMessages([]); }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-left
                      ${selectedAgent?.id === agent.id ? "bg-neutral-900" : "hover:bg-neutral-900/50"}
                    `}
                  >
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

          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-1.5 pl-2 shadow-2xl shadow-black/50 transition-colors focus-within:border-neutral-700">
            
            <AgentBadge 
              agent={selectedAgent} 
              isOpen={showAgentMenu} 
              onClick={() => setShowAgentMenu(!showAgentMenu)} 
            />

            <input
              className="flex-1 bg-transparent text-white text-sm font-light px-2 py-2 outline-none placeholder:text-neutral-700"
              placeholder={selectedAgent ? "Enter command..." : "Select agent..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
              autoComplete="off"
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={`
                p-2 rounded-lg transition-all duration-300
                ${!input.trim() || loading 
                  ? "opacity-20 cursor-not-allowed" 
                  : "bg-white text-black hover:scale-105"
                }
              `}
            >
              <Send size={16} strokeWidth={2} />
            </button>
          </div>
          
          <p className="text-center text-[9px] text-neutral-700 mt-3 font-mono tracking-wide">
            Grok AI Model v1.0 // Output generated by AI
          </p>
        </div>
      </div>
    </div>
  );
}