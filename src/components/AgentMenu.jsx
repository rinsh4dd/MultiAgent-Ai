import { Circle } from "lucide-react";

export default function AgentMenu({ agents, selectedAgent, onSelectAgent }) {
  return (
    <div className="absolute bottom-full left-0 mb-3 w-64 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 py-3 border-b border-neutral-900 bg-white/[0.02]">
        <h3 className="text-[10px] font-bold uppercase text-neutral-500 tracking-[0.15em]">
          Available Intelligence
        </h3>
      </div>

      <div className="max-h-60 overflow-y-auto p-1.5">
        {agents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left mb-0.5 last:mb-0 
                ${isSelected ? "bg-white/5 shadow-inner" : "hover:bg-white/[0.03]"}`}
            >
              <div className="relative">
                <Circle
                  size={8}
                  className={`${
                    isSelected ? "fill-emerald-500 text-emerald-500" : "text-neutral-800"
                  }`}
                />
                {isSelected && (
                   <span className="absolute inset-0 bg-emerald-500/20 blur-sm rounded-full" />
                )}
              </div>
              
              <div className="flex flex-col min-w-0">
                <p className={`text-xs font-medium ${isSelected ? "text-white" : "text-neutral-400"}`}>
                  {agent.name}
                </p>
                <p className="text-[9px] text-neutral-600 font-mono uppercase truncate">
                  {agent.role || "General Purpose"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}