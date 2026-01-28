import { Bot, ChevronDown } from "lucide-react";

export default function AgentBadge({ agent, onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 transition-all active:scale-95 shadow-sm"
    >
      <div className="relative flex items-center justify-center">
        <Bot
          size={16}
          strokeWidth={1.5}
          className="text-neutral-400 group-hover:text-white transition-colors"
        />
        {/* The "Active" Indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-black" />
      </div>

      <div className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-semibold text-neutral-300 group-hover:text-white uppercase tracking-wider">
          {agent ? agent.name : "Select Agent"}
        </span>
      </div>

      <ChevronDown
        size={12}
        className={`text-neutral-600 transition-transform duration-300 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}