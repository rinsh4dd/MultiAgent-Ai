import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Edit, Trash2, Plus, Bot, FileText, Globe, Cpu } from "lucide-react";

export default function AgentList({ onEdit, onCreate }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH DATA ---
  const fetchAgents = async () => {
    try {
      const snap = await getDocs(collection(db, "agents"));
      const agentData = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAgents(agentData);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // --- 2. DELETE HANDLER ---
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent triggering other clicks
    if (!window.confirm("Permanently delete this agent?")) return;

    try {
      await deleteDoc(doc(db, "agents", id));
      // Optimistic UI update (remove from list immediately)
      setAgents((prev) => prev.filter((agent) => agent.id !== id));
    } catch (error) {
      alert("Error deleting agent");
    }
  };

  // --- 3. LOADING STATE ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-neutral-500 space-y-4">
        <Cpu size={24} className="animate-spin text-emerald-500" />
        <p className="text-xs font-mono uppercase tracking-widest">Accessing Neural Database...</p>
      </div>
    );
  }

  // --- 4. RENDER LIST ---
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight">Active Agents</h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">MANAGE YOUR AI Agents</p>
        </div>
        
        <button 
          onClick={onCreate}
          className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded text-xs font-bold tracking-wider hover:bg-neutral-200 transition-all hover:scale-105"
        >
          <Plus size={16} /> NEW AGENT
        </button>
      </div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="group relative bg-neutral-900/30 border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all duration-300 flex flex-col h-full"
          >
            
            {/* TOP ACTIONS (Hidden until hover) */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onEdit(agent)} 
                className="p-1.5 bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
                title="Edit Configuration"
              >
                <Edit size={14} />
              </button>
              <button 
                onClick={(e) => handleDelete(agent.id, e)} 
                className="p-1.5 bg-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-red-900/30 rounded-md transition-colors"
                title="Decommission Agent"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* ICON & IDENTITY */}
            <div className="mb-4">
              <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center border border-neutral-700 mb-3 group-hover:border-emerald-500/50 transition-colors">
                <Bot size={20} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium text-white leading-tight">{agent.name}</h3>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-wide mt-1 truncate">
                {agent.role || "General Assistant"}
              </p>
            </div>

            {/* DESCRIPTION (Truncated) */}
            <div className="flex-1">
              <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                {agent.behaviour}
              </p>
            </div>
            
            {/* FOOTER STATS */}
            <div className="flex items-center gap-4 text-[10px] text-neutral-600 font-mono border-t border-neutral-800/50 pt-4 mt-4">
              <div className="flex items-center gap-1.5">
                <FileText size={12} /> 
                <span>{agent.fileCount || 0} FILES</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe size={12} /> 
                <span>{agent.linkCount || 0} LINKS</span>
              </div>
            </div>

          </div>
        ))}

        {/* EMPTY STATE (If no agents) */}
        {agents.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl text-neutral-600">
            <Bot size={48} strokeWidth={1} className="mb-4 opacity-50" />
            <p className="text-sm font-light">No agents deployed yet.</p>
            <button onClick={onCreate} className="mt-4 text-emerald-500 text-xs hover:underline uppercase tracking-wide">
              Initialize First Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}