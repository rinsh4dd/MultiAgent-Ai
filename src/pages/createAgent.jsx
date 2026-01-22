import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { processFiles } from "../utils/fileProcessor";
import { useToast } from "../components/Toast";
import { Sparkles, Loader2, Fingerprint, FileText, Globe } from "lucide-react";

// Import the new clean components
import { 
  SectionHeader, 
  IdentitySection, 
  BehaviourSection, 
  FileKnowledgeSection, 
  WebKnowledgeSection 
} from "../components/CreateAgent/AgentFormSections";

// Helper: Preview Modal (Can remain here or move to separate file)
const PreviewModal = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 shadow-2xl rounded-lg overflow-hidden">
        {/* Modal Header/Content/Footer logic here (abbreviated for brevity) */}
        <div className="p-4 bg-black">
             <textarea readOnly value={content} className="w-full h-[60vh] bg-transparent text-xs font-mono text-neutral-400 resize-none custom-scrollbar" />
        </div>
        <button onClick={onClose} className="w-full py-2 bg-neutral-900 text-xs uppercase text-neutral-500 hover:text-white">Close</button>
      </div>
    </div>
  );
};

export default function CreateAgent() {
  const { addToast } = useToast();

  // --- STATE ---
  const [formData, setFormData] = useState({ name: "", age: "", behaviour: "", role: "" });
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [currentLink, setCurrentLink] = useState("");
  const [currentLinkText, setCurrentLinkText] = useState("");
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
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
    if (!currentLink || !currentLinkText) return addToast("URL and Content required", "error");
    setLinks((prev) => [...prev, { url: currentLink, content: currentLinkText }]);
    setCurrentLink("");
    setCurrentLinkText("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.behaviour) return addToast("Name & Behavior required", "error");
    setLoading(true);
    try {
      setStatusMsg("Reading Files & Analyzing Images...");
      const fileKnowledge = await processFiles(files);
      
      setStatusMsg("Compiling Web Data...");
      const linkKnowledge = links.map((l) => `\n\n=== WEB SOURCE: ${l.url} ===\n${l.content}`).join("");
      
      setStatusMsg("Deploying Agent...");
      await addDoc(collection(db, "agents"), {
        ...formData,
        knowledgeBase: `${fileKnowledge}\n${linkKnowledge}`,
        fileCount: files.length,
        linkCount: links.length,
        createdAt: new Date(),
      });
      addToast("Agent Deployed Successfully!", "success");
      setFormData({ name: "", age: "", behaviour: "", role: "" });
      setFiles([]);
      setLinks([]);
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
        <div className="w-full max-w-6xl">
          <header className="mb-12 space-y-1">
            <h1 className="text-2xl font-thin tracking-tight text-white">Construct Multi-Modal Agent</h1>
          </header>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 space-y-10">
              <section>
                <SectionHeader icon={Fingerprint} title="AGENT IDENTITY" />
                <IdentitySection formData={formData} onChange={handleInputChange} />
              </section>
              <section>
                <BehaviourSection value={formData.behaviour} onChange={handleInputChange} />
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              <section>
                <SectionHeader icon={FileText} title="FILE KNOWLEDGE" />
                <FileKnowledgeSection 
                  files={files} 
                  onAdd={handleFileChange} 
                  onRemove={(i) => setFiles(p => p.filter((_, idx) => idx !== i))} 
                />
              </section>

              <section>
                <SectionHeader icon={Globe} title="WEB KNOWLEDGE" />
                <WebKnowledgeSection 
                  links={links}
                  currentLink={currentLink}
                  currentLinkText={currentLinkText}
                  isFetching={isFetchingLink}
                  onLinkChange={setCurrentLink}
                  onContentChange={setCurrentLinkText}
                  onFetch={fetchLinkContent}
                  onAdd={addLink}
                  onRemove={(i) => setLinks(p => p.filter((_, idx) => idx !== i))}
                  onPreview={() => setIsPreviewOpen(true)}
                />
              </section>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className={`
                  mt-auto w-full py-4 border text-xs uppercase tracking-[0.2em] transition-all duration-500
                  flex items-center justify-center gap-3
                  ${loading ? "border-neutral-800 text-neutral-600 cursor-not-allowed" : "border-neutral-700 hover:border-white text-white hover:bg-white/5"}
                `}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} strokeWidth={1} />}
                {loading ? statusMsg || "SYNTHESIZING..." : "DEPLOY AGENT"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}