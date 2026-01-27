import { useState } from "react";
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
      let finalKnowledge = initialData?.knowledgeBase || "";

      if (files.length > 0) {
        setStatusMsg("Analyzing New Files...");
        const newFileKnowledge = await processFiles(files);
        finalKnowledge += `\n${newFileKnowledge}`;
      }

      if (links.length > 0) {
        setStatusMsg("Compiling Web Data...");
        const newLinkKnowledge = links
          .map((l) => `\n\n=== WEB SOURCE: ${l.url} ===\n${l.content}`)
          .join("");
        finalKnowledge += newLinkKnowledge;
      }

      const previousLinks = initialData?.savedLinks || [];
      const newLinksList = links.map((l) => ({
        url: l.url,
        addedAt: new Date().toISOString(),
      }));
      const updatedSavedLinks = [...previousLinks, ...newLinksList];

      const payload = {
        ...formData,
        knowledgeBase: finalKnowledge,
        fileCount: (initialData?.fileCount || 0) + files.length,
        linkCount: (initialData?.linkCount || 0) + links.length,
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
                  ? `Edit Protocol: ${initialData.name}`
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
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              {/* --- NEW SECTION: DISPLAY SAVED (READ-ONLY) LINKS --- */}
              {isEditing && initialData?.savedLinks?.length > 0 && (
                <section className="bg-neutral-900/30 p-4 rounded-lg border border-neutral-800">
                  <div className="flex items-center gap-2 mb-3 text-neutral-400">
                    <Lock size={12} />
                    <span className="text-[10px] font-mono uppercase tracking-wider">
                      Learned Sources (Read-Only)
                    </span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {initialData.savedLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-neutral-950 border border-neutral-800 rounded opacity-60"
                      >
                        <LinkIcon
                          size={12}
                          className="text-neutral-600 shrink-0"
                        />
                        <span
                          className="text-xs font-mono text-neutral-400 truncate flex-1"
                          title={link.url}
                        >
                          {link.url}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-neutral-600 mt-2 font-mono italic">
                    * These sources are already integrated into the knowledge
                    base and cannot be individually removed.
                  </p>
                </section>
              )}

              <section>
                <SectionHeader
                  icon={FileText}
                  title={isEditing ? "ADD MORE FILES" : "FILE KNOWLEDGE"}
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
                  title={isEditing ? "ADD MORE LINKS" : "WEB KNOWLEDGE"}
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
                    ? "UPDATE & TRAIN"
                    : "DEPLOY AGENT"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
