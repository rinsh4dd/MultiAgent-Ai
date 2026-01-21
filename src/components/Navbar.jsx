import React from "react";
import { MessageSquare, Plus, Command } from "lucide-react";

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <nav className="h-14 border-b border-neutral-800 bg-black flex items-center justify-between px-6 shrink-0 select-none">
      
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center">
           <Command size={14} strokeWidth={1.5} className="text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <h1 className="text-sm font-medium text-white tracking-wide">
            MULTI AGENT<span className="text-neutral-500"> AI</span>
          </h1>
          
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center h-full">
        <NavTab 
          label="CHAT" 
          icon={MessageSquare} 
          isActive={activeTab === "chat"} 
          onClick={() => setActiveTab("chat")} 
        />
        <div className="w-px h-4 bg-neutral-800 mx-2" />
        <NavTab 
          label="Deploy Agent" 
          icon={Plus} 
          isActive={activeTab === "create"} 
          onClick={() => setActiveTab("create")} 
        />
      </div>
    </nav>
  );
}

/* --- Helper: Tab Item --- */
function NavTab({ label, icon: Icon, isActive, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`
        relative h-14 px-4 flex items-center gap-2 text-xs uppercase tracking-wider transition-all duration-300
        hover:bg-neutral-900/40
        ${isActive ? "text-white" : "text-neutral-500 hover:text-neutral-300"}
      `}
    >
      <Icon size={14} strokeWidth={1.5} className={isActive ? "text-emerald-500" : "opacity-70"} />
      <span>{label}</span>
      
      {/* Active Indicator Line */}
      {isActive && (
        <span className="absolute bottom-0 left-0 w-full h-[1px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
      )}
    </button>
  );
}