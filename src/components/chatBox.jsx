import { Mic, Send, Image as ImageIcon, X } from "lucide-react";
import RecordingIndicator from "./RecordingIndicator";
import VoiceMessage from "./voiceMessage";
import AgentBadge from "./AgentBadge";
import AgentMenu from "./AgentMenu";

export default function ChatInputBox({
  input, setInput, textareaRef, isRecording, startRecording, stopRecording,
  audioPreviewUrl, clearAudio, imagePreview, setImagePreview, handleImageUpload,
  fileInputRef, handleSend, loading, agents, selectedAgent, setSelectedAgent,
  showAgentMenu, setShowAgentMenu, setMessages
}) {
  return (
    <div className="relative w-full max-w-3xl mx-auto px-4">
      {(imagePreview || audioPreviewUrl) && (
        <div className="flex flex-wrap gap-3 mb-3 animate-in slide-in-from-bottom-2">
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} className="h-20 w-20 object-cover rounded-xl border border-neutral-800 shadow-lg" alt="Preview" />
              <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 bg-neutral-900 border border-neutral-800 rounded-full p-1 hover:text-red-500 transition-colors"><X size={12} /></button>
            </div>
          )}
          {audioPreviewUrl && (
            <div className="relative flex items-center bg-neutral-950 border border-neutral-800 rounded-2xl p-2 pr-4">
              <VoiceMessage src={audioPreviewUrl} />
              <button onClick={clearAudio} className="ml-2 p-1.5 hover:text-red-500 transition-colors"><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      <div className={`flex flex-col gap-2 bg-neutral-950 border rounded-2xl p-3 transition-all duration-300 shadow-2xl ${isRecording ? "border-red-500/40 ring-1 ring-red-500/10" : "border-neutral-800 focus-within:border-neutral-700"}`}>
        {isRecording && <RecordingIndicator />}
        <textarea
          ref={textareaRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={isRecording ? "" : "Ask anything..."} disabled={loading || isRecording}
          className="w-full bg-transparent text-white text-base px-2 py-1 outline-none resize-none placeholder:text-neutral-600 min-h-[24px] max-h-48"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !loading && (e.preventDefault(), handleSend())}
        />

        <div className="flex items-center justify-between pt-1 border-t border-neutral-900/50">
          <div className="relative">
            {showAgentMenu && (
              <AgentMenu 
                agents={agents} selectedAgent={selectedAgent} 
                onSelectAgent={(agent) => {
                  setSelectedAgent(agent);
                  setShowAgentMenu(false);
                  setMessages([]); // Clears chat history on switch
                }} 
              />
            )}
            <AgentBadge agent={selectedAgent} isOpen={showAgentMenu} onClick={() => setShowAgentMenu(!showAgentMenu)} />
          </div>

          <div className="flex items-center gap-1">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current.click()} className="p-2.5 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-xl transition-all"><ImageIcon size={19} strokeWidth={1.5} /></button>
            <button onClick={isRecording ? stopRecording : startRecording} className={`p-2.5 rounded-xl transition-all ${isRecording ? "bg-red-500/10 text-red-500" : "text-neutral-500 hover:text-white hover:bg-neutral-900"}`}><Mic size={19} /></button>
            <button onClick={handleSend} disabled={(!input.trim() && !audioPreviewUrl && !imagePreview) || loading || isRecording} className="ml-2 p-2.5 bg-white text-black rounded-xl disabled:opacity-10 transition-all hover:scale-[1.02] active:scale-[0.98]"><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}