import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { processFiles } from "../utils/fileProcessor";
import { useToast } from "../components/Toast";
import { VOICE_PROFILES } from "../config/voice";
import { speak } from "../services/ttsService";
import { 
  Sparkles, Loader2, Fingerprint, FileText, Globe, 
  ArrowLeft, Trash2, Database, Volume2, Play, CheckCircle2 
} from "lucide-react";

import {
  SectionHeader,
  IdentitySection,
  BehaviourSection,
  FileKnowledgeSection,
  WebKnowledgeSection,
} from "../components/CreateAgent/AgentFormSections";

// Preview Modal remains the same
const PreviewModal = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 bg-neutral-900/50 border-b border-neutral-800 flex justify-between items-center">
          <span className="text-[10px] font-mono text-neutral-500 tracking-widest">CONTENT_PREVIEW.RAW</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="flex-1 p-0 overflow-hidden">
          <textarea
            readOnly
            value={content}
            className="w-full h-full bg-transparent text-xs font-mono text-neutral-400 resize-none p-6 outline-none custom-scrollbar leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};

export default function CreateAgent({ onBack, initialData = null }) {
  const { addToast } = useToast();
  const isEditing = !!initialData;
  const [selectedVoice, setSelectedVoice] = useState(initialData?.voiceProfile || "en_female_soft");
  const [playingVoice, setPlayingVoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // State Management
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    age: initialData?.age || "",
    behaviour: initialData?.behaviour || "",
    role: initialData?.role || "",
  });
  const [knowledgeBase, setKnowledgeBase] = useState(initialData?.knowledgeBase || "");
  const [savedLinks, setSavedLinks] = useState(initialData?.savedLinks || []);
  const [savedFiles, setSavedFiles] = useState(initialData?.savedFiles || []);
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [currentLink, setCurrentLink] = useState("");
  const [currentLinkText, setCurrentLinkText] = useState("");
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearKnowledge = () => {
    if (window.confirm("Initialize memory wipe? This action cannot be undone.")) {
      setKnowledgeBase("");
      setSavedLinks([]);
      setSavedFiles([]);
      addToast("Neural memory cleared", "success");
    }
  };

  const fetchLinkContent = async () => {
    if (!currentLink) return addToast("URL required", "error");
    setIsFetchingLink(true);
    try {
      const response = await fetch(`https://r.jina.ai/${currentLink}`);
      if (!response.ok) throw new Error();
      const text = await response.text();
      setCurrentLinkText(text);
      addToast("Source data indexed", "success");
    } catch (e) {
      addToast("Crawl failed. Manual entry required.", "error");
    } finally { setIsFetchingLink(false); }
  };

  const addLink = () => {
    if (!currentLink || !currentLinkText) return addToast("Missing URL/Content", "error");
    setLinks((prev) => [...prev, { url: currentLink, content: currentLinkText }]);
    setCurrentLink("");
    setCurrentLinkText("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.behaviour) return addToast("Primary fields required", "error");
    setLoading(true);

    try {
      let finalKnowledge = knowledgeBase;
      let newSavedFiles = [...savedFiles];

      if (files.length > 0) {
        setStatusMsg("Processing documents...");
        const processed = await processFiles(files);
        
        processed.forEach(pf => {
          finalKnowledge += `\n\n=== SOURCE: ${pf.name} ===\n${pf.content}`;
          newSavedFiles.push({ name: pf.name, addedAt: new Date().toISOString() });
        });
      }
      if (links.length > 0) {
        setStatusMsg("Synthesizing web data...");
        const newLinkKnowledge = links.map(l => `\n\n=== SOURCE: ${l.url} ===\n${l.content}`).join("");
        finalKnowledge += newLinkKnowledge;
      }

      const updatedSavedLinks = [...savedLinks, ...links.map(l => ({ url: l.url, addedAt: new Date().toISOString() }))];
      const payload = {
        ...formData,
        voiceProfile: selectedVoice,
        knowledgeBase: finalKnowledge,
        fileCount: newSavedFiles.length,
        linkCount: updatedSavedLinks.length,
        savedLinks: updatedSavedLinks,
        savedFiles: newSavedFiles,
        updatedAt: new Date(),
      };

      if (isEditing) {
        setStatusMsg("Syncing core...");
        await updateDoc(doc(db, "agents", initialData.id), payload);
        addToast("Update complete", "success");
      } else {
        setStatusMsg("Deploying instance...");
        await addDoc(collection(db, "agents"), { ...payload, createdAt: new Date() });
        addToast("Agent deployed", "success");
      }
      onBack();
    } catch (error) { addToast(error.message, "error"); }
    finally { setLoading(false); setStatusMsg(""); }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-300 p-4 md:p-8 lg:p-12 font-sans selection:bg-emerald-500/30">
      <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} content={currentLinkText} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center gap-6 border-b border-neutral-900 pb-10">
          <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-all text-neutral-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="space-y-1">
            <h1 className="text-3xl font-light tracking-tighter text-white uppercase italic">
              {isEditing ? `Edit / ${initialData.name}` : "Initialize Agent"}
            </h1>
            <p className="text-[10px] font-mono text-emerald-500 tracking-[0.4em] uppercase opacity-70">
              {isEditing ? `Node: ${initialData.id}` : "Core Identity Config"}
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Config Column */}
          <div className="lg:col-span-7 space-y-16">
            <section className="space-y-8">
              <SectionHeader icon={Fingerprint} title="Biological Identity" />
              <IdentitySection formData={formData} onChange={handleInputChange} />
            </section>

            <section className="space-y-8">
              <SectionHeader icon={Sparkles} title="Behavioral Protocol" />
              <BehaviourSection value={formData.behaviour} onChange={handleInputChange} />
            </section>

            {/* Modernized Voice Section */}
            <section className="space-y-8">
              <SectionHeader icon={Volume2} title="Acoustic Profile" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {VOICE_PROFILES.map((v) => {
                  const isActive = selectedVoice === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                        ${isActive ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/50" : "border-neutral-800 bg-neutral-900/20 hover:border-neutral-700"}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isActive ? "bg-emerald-500 text-black" : "bg-neutral-800 text-neutral-400 group-hover:text-white"}`}>
                          {isActive ? <CheckCircle2 size={20} /> : <Volume2 size={18} />}
                        </div>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setPlayingVoice(v.id);
                            const url = await speak(v.demoText, v.id);
                            new Audio(url).play();
                            setTimeout(() => setPlayingVoice(null), 2000);
                          }}
                          className="flex items-center gap-2 text-[9px] font-mono uppercase bg-neutral-800 hover:bg-white hover:text-black px-3 py-1.5 rounded-lg transition-all"
                        >
                          {playingVoice === v.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                          Preview
                        </button>
                      </div>
                      <h4 className={`text-sm font-medium ${isActive ? "text-white" : "text-neutral-300"}`}>{v.label}</h4>
                      <p className="text-[10px] font-mono text-neutral-500 mt-1 uppercase tracking-widest">{v.voice}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {isEditing && (
              <section className="p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database size={16} className="text-emerald-500" />
                    <h3 className="text-xs font-bold tracking-[0.2em] text-white uppercase">Neural Database</h3>
                  </div>
                  {knowledgeBase && (
                    <button type="button" onClick={handleClearKnowledge} className="text-[10px] text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 transition-all font-mono uppercase tracking-tighter">
                      Purge Data
                    </button>
                  )}
                </div>
                <textarea readOnly value={knowledgeBase || "// Memory offline."} className="w-full h-48 bg-black/40 text-[11px] font-mono text-neutral-500 p-6 rounded-2xl border border-neutral-800 resize-none custom-scrollbar" />
              </section>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-8 space-y-8">
              <section className="bg-neutral-900/30 p-8 rounded-3xl border border-neutral-800 space-y-6">
                <SectionHeader icon={FileText} title="Knowledge Uploads" />
                <FileKnowledgeSection 
                  files={files} 
                  savedFiles={savedFiles}
                  onAdd={(e) => e.target.files && setFiles(p => [...p, ...Array.from(e.target.files)])} 
                  onRemove={(i) => setFiles(p => p.filter((_, idx) => idx !== i))}
                  onRemoveSaved={(name) => {
                    setSavedFiles(p => p.filter(f => f.name !== name));
                    // Optional: Try to remove the text block from knowledgeBase
                    const marker = `=== SOURCE: ${name} ===`;
                    if (knowledgeBase.includes(marker)) {
                      const parts = knowledgeBase.split(marker);
                      // This is a simple heuristic: remove from marker until next marker or end
                      const after = parts[1].split("=== SOURCE:")[1] || "";
                      const before = parts[0];
                      setKnowledgeBase(before + (after ? `=== SOURCE:${after}` : ""));
                    }
                    addToast(`Removed ${name} from core memory`, "success");
                  }}
                />
              </section>

              <section className="bg-neutral-900/30 p-8 rounded-3xl border border-neutral-800 space-y-6">
                <SectionHeader icon={Globe} title="Web Indexing" />
                <WebKnowledgeSection 
                  links={links} currentLink={currentLink} currentLinkText={currentLinkText} isFetching={isFetchingLink}
                  onLinkChange={setCurrentLink} onContentChange={setCurrentLinkText} onFetch={fetchLinkContent} onAdd={addLink}
                  onPreview={() => setIsPreviewOpen(true)} onRemove={(i) => setLinks(p => p.filter((_, idx) => idx !== i))}
                />
              </section>

              <button
                type="submit"
                disabled={loading}
                className={`group w-full py-6 rounded-2xl border text-xs font-bold uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-4
                  ${loading ? "bg-neutral-900 border-neutral-800 text-neutral-600" : "bg-white text-black hover:bg-emerald-500 hover:border-emerald-500"}`}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? statusMsg : (isEditing ? "Sync & Deploy" : "Deploy Agent")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}