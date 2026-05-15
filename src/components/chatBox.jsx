import { Mic, Send, Image as ImageIcon, X, AudioLines, MessageSquareText } from "lucide-react";
import RecordingIndicator from "./RecordingIndicator";
import VoiceMessage from "./voiceMessage";
import AgentBadge from "./AgentBadge";
import AgentMenu from "./AgentMenu";

export default function ChatInputBox({
  input, setInput, textareaRef, isRecording, startRecording, stopRecording,
  audioPreviewUrl, clearAudio, imagePreview, setImagePreview, handleImageUpload,
  fileInputRef, handleSend, loading, agents, selectedAgent, setSelectedAgent,
  showAgentMenu, setShowAgentMenu, setMessages, voiceEnabled, setVoiceEnabled,
}) {
  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 pb-4">
      
      {/* 🖼️ PREVIEW SECTION */}
      {(imagePreview || audioPreviewUrl) && (
        <div className="flex flex-wrap gap-3 mb-3 animate-in fade-in slide-in-from-bottom-2">
          {imagePreview && (
            <div className="relative group">
              <img
                src={imagePreview}
                className="h-24 w-24 object-cover rounded-2xl border-2 border-neutral-800 shadow-lg"
                alt="Preview"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {audioPreviewUrl && (
            <div className="relative flex items-center bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-2xl p-2 pr-4 shadow-xl">
              <VoiceMessage src={audioPreviewUrl} />
              <button
                onClick={clearAudio}
                className="ml-2 p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ⌨️ INPUT CONTAINER */}
      <div className={`
        flex flex-col gap-2 bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 
        rounded-[24px] p-3 shadow-2xl transition-all duration-200
        ${isRecording ? "ring-2 ring-red-500/20 border-red-900/50" : "focus-within:border-neutral-700 focus-within:ring-4 focus-within:ring-white/5"}
      `}>
        
        {isRecording && (
          <div className="px-2 py-1">
            <RecordingIndicator />
          </div>
        )}

        {/* 📝 TEXTAREA */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRecording ? "Listening..." : "Ask anything..."}
          disabled={loading || isRecording}
          className="w-full bg-transparent text-white px-3 py-2 outline-none resize-none placeholder:text-neutral-600 text-[15px] leading-relaxed min-h-[40px] max-h-48"
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && !loading && (e.preventDefault(), handleSend())
          }
        />

        {/* 🛠️ ACTION BAR */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-900/80">
          <div className="flex items-center gap-2">
            <div className="relative">
              {showAgentMenu && (
                <AgentMenu
                  agents={agents}
                  selectedAgent={selectedAgent}
                  onSelectAgent={(agent) => {
                    setSelectedAgent(agent);
                    setShowAgentMenu(false);
                    setMessages([]);
                  }}
                />
              )}
              <AgentBadge
                agent={selectedAgent}
                isOpen={showAgentMenu}
                onClick={() => setShowAgentMenu(!showAgentMenu)}
              />
            </div>

            {/* 🔊 MODE TOGGLE (Integrated into bottom bar) */}
            <button
              onClick={() => setVoiceEnabled(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all
                ${voiceEnabled 
                  ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                  : "bg-neutral-900 text-neutral-500 border border-transparent hover:border-neutral-700"}
              `}
            >
              {voiceEnabled ? <AudioLines size={14} /> : <MessageSquareText size={14} />}
              {voiceEnabled ? "Voice" : "Text"}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
            />
            
            <button
              onClick={() => fileInputRef.current.click()}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl transition-colors"
              title="Upload Image"
            >
              <ImageIcon size={20} />
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-xl transition-all ${
                isRecording 
                ? "text-red-500 bg-red-500/10" 
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Mic size={20} className={isRecording ? "animate-pulse" : ""} />
            </button>

            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !imagePreview && !audioPreviewUrl)}
              className="ml-1 p-2.5 bg-white text-black rounded-xl hover:bg-neutral-200 disabled:opacity-10 disabled:grayscale transition-all active:scale-95 shadow-lg"
            >
              <Send size={18} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}