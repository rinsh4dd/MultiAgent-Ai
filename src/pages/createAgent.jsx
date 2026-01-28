import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { processFiles } from "../utils/fileProcessor";
import { useToast } from "../components/Toast";
import {
  Sparkles,
  Loader2,
  Fingerprint,
  FileText,
  Globe,
  ArrowLeft,
  Link as LinkIcon,
  Lock,
  Trash2,
  Database,
  RefreshCw,
} from "lucide-react";
import {
  SectionHeader,
  IdentitySection,
  BehaviourSection,
  FileKnowledgeSection,
  WebKnowledgeSection,
} from "../components/CreateAgent/AgentFormSections";

// Helper: Preview Modal
const PreviewModal = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 bg-black border-b border-neutral-800 flex justify-between items-center">
          <span className="text-xs font-mono text-neutral-500">
            CONTENT PREVIEW
          </span>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 p-0 overflow-hidden">
          <textarea
            readOnly
            value={content}
            className="w-full h-full bg-neutral-950 text-xs font-mono text-neutral-400 resize-none p-4 outline-none custom-scrollbar"
          />
        </div>
      </div>
    </div>
  );
};

export default function CreateAgent({ onBack, initialData = null }) {
  const { addToast } = useToast();
  const isEditing = !!initialData;

  // --- STATE ---
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    age: initialData?.age || "",
    behaviour: initialData?.behaviour || "",
    role: initialData?.role || "",
  });

  // Knowledge Base State
  const [knowledgeBase, setKnowledgeBase] = useState(
    initialData?.knowledgeBase || ""
  );
  const [savedLinks, setSavedLinks] = useState(initialData?.savedLinks || []);

  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);

  const [currentLink, setCurrentLink] = useState("");
  const [currentLinkText, setCurrentLinkText] = useState("");
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Handler functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files)
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const handleClearKnowledge = () => {
    if (
      window.confirm(
        "Are you sure? This will wipe all existing knowledge text for this agent."
      )
    ) {
      setKnowledgeBase(""); // Clear the text content
      setSavedLinks([]); // Clear the saved links list visually
      addToast("Knowledge Base Cleared. Save to apply.", "success");
    }
  };

  const fetchLinkContent = async () => {
    if (!currentLink) return addToast("Enter URL first", "error");
    setIsFetchingLink(true);
    try {
      const response = await fetch(`https://r.jina.ai/${currentLink}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const text = await response.text();
      setCurrentLinkText(text);
      addToast("Link content fetched", "success");
    } catch (e) {
      addToast("Could not fetch. Paste text manually.", "error");
    } finally {
      setIsFetchingLink(false);
    }
  };

  const addLink = () => {
    if (!currentLink || !currentLinkText)
      return addToast("URL and Content required", "error");
    setLinks((prev) => [
      ...prev,
      { url: currentLink, content: currentLinkText },
    ]);
    setCurrentLink("");
    setCurrentLinkText("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.behaviour)
      return addToast("Name & Behavior required", "error");
    setLoading(true);

    try {
      // Start with whatever is currently in the knowledgeBase state
      let finalKnowledge = knowledgeBase;

      if (files.length > 0) {
        setStatusMsg("Analyzing New Files...");
        const newFileKnowledge = await processFiles(files);
        // Append new file data
        finalKnowledge += `\n\n=== NEW FILE UPLOAD ===\n${newFileKnowledge}`;
      }

      if (links.length > 0) {
        setStatusMsg("Compiling Web Data...");
        const newLinkKnowledge = links
          .map((l) => `\n\n=== WEB SOURCE: ${l.url} ===\n${l.content}`)
          .join("");
        // Append new link data
        finalKnowledge += newLinkKnowledge;
      }

      // Merge new links into the savedLinks array
      const newLinksList = links.map((l) => ({
        url: l.url,
        addedAt: new Date().toISOString(),
      }));
      const updatedSavedLinks = [...savedLinks, ...newLinksList];

      const payload = {
        ...formData,
        knowledgeBase: finalKnowledge,
        fileCount: (isEditing && knowledgeBase ? initialData.fileCount : 0) + files.length, // Logic: if KB cleared, reset count roughly
        linkCount: updatedSavedLinks.length,
        savedLinks: updatedSavedLinks,
        updatedAt: new Date(),
      };

      if (isEditing) {
        setStatusMsg("Updating Agent...");
        await updateDoc(doc(db, "agents", initialData.id), payload);
        addToast("Agent Updated!", "success");
      } else {
        setStatusMsg("Deploying Agent...");
        await addDoc(collection(db, "agents"), {
          ...payload,
          createdAt: new Date(),
        });
        addToast("Agent Deployed!", "success");
      }
      onBack();
    } catch (error) {
      addToast("Error: " + error.message, "error");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <>
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        content={currentLinkText}
      />

      <div className="min-h-screen bg-black text-neutral-200 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4">
          <header className="mb-8 flex items-center gap-4 border-b border-neutral-800 pb-6">
            <button
              onClick={onBack}
              className="p-2 hover:bg-neutral-900 rounded-full text-neutral-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-light text-white uppercase tracking-widest">
                {isEditing
                  ? `Edit Agent: ${initialData.name}`
                  : "Initialize New Agent"}
              </h1>
              <p className="text-[10px] font-mono text-neutral-500">
                {isEditing
                  ? `ID: ${initialData.id}`
                  : "ESTABLISH IDENTITY & KNOWLEDGE BASE"}
              </p>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12"
          >
            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 space-y-10">
              <section>
                <SectionHeader icon={Fingerprint} title="AGENT IDENTITY" />
                <IdentitySection
                  formData={formData}
                  onChange={handleInputChange}
                />
              </section>
              <section>
                <BehaviourSection
                  value={formData.behaviour}
                  onChange={handleInputChange}
                />
              </section>

              {/* --- NEW: MANAGE EXISTING KNOWLEDGE --- */}
              {isEditing && (
                <section className="bg-neutral-900/30 p-5 rounded-lg border border-neutral-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Database size={16} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Core Neural Memory
                      </span>
                    </div>
                    {knowledgeBase && (
                      <button
                        type="button"
                        onClick={handleClearKnowledge}
                        className="flex items-center gap-2 text-[10px] text-red-500 hover:text-red-400 bg-red-950/20 px-3 py-1.5 rounded border border-red-900/30 transition-colors"
                      >
                        <Trash2 size={12} />
                        WIPE MEMORY
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      value={
                        knowledgeBase ||
                        "// Memory is empty. Agent relies on base LLM knowledge."
                      }
                      className="w-full h-48 bg-neutral-950 text-[10px] font-mono text-neutral-400 p-4 rounded border border-neutral-800 resize-none outline-none custom-scrollbar leading-relaxed"
                    />
                    <div className="absolute bottom-2 right-2 text-[9px] text-neutral-600 bg-neutral-950/80 px-2 py-1 rounded">
                      {knowledgeBase.length} chars
                    </div>
                  </div>

                  {savedLinks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-800/50">
                      <p className="text-[10px] text-neutral-500 mb-2 uppercase tracking-wide">
                        Integrated Sources:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {savedLinks.map((l, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 truncate max-w-[200px]"
                            title={l.url}
                          >
                            {l.url}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              <section>
                <SectionHeader
                  icon={FileText}
                  title={isEditing ? "APPEND FILES" : "FILE KNOWLEDGE"}
                />
                <FileKnowledgeSection
                  files={files}
                  onAdd={handleFileChange}
                  onRemove={(i) =>
                    setFiles((p) => p.filter((_, idx) => idx !== i))
                  }
                />
              </section>

              <section>
                <SectionHeader
                  icon={Globe}
                  title={isEditing ? "APPEND LINKS" : "WEB KNOWLEDGE"}
                />
                <WebKnowledgeSection
                  links={links}
                  currentLink={currentLink}
                  currentLinkText={currentLinkText}
                  isFetching={isFetchingLink}
                  onLinkChange={setCurrentLink}
                  onContentChange={setCurrentLinkText}
                  onFetch={fetchLinkContent}
                  onAdd={addLink}
                  onRemove={(i) =>
                    setLinks((p) => p.filter((_, idx) => idx !== i))
                  }
                  onPreview={() => setIsPreviewOpen(true)}
                />
              </section>

              <button
                type="submit"
                disabled={loading}
                className={`
                    mt-auto w-full py-4 border text-xs uppercase tracking-[0.2em] transition-all duration-500
                    flex items-center justify-center gap-3
                    ${loading ? "border-neutral-800 text-neutral-600 cursor-not-allowed" : "border-neutral-700 hover:border-white text-white hover:bg-white/5"}
                  `}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} strokeWidth={1} />
                )}
                {loading
                  ? statusMsg
                  : isEditing
                    ? "SAVE & RETRAIN"
                    : "DEPLOY AGENT"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}