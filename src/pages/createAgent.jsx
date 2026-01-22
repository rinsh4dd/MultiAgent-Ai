import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { processFiles } from "../utils/fileProcessor"; // Keeps your logic clean
import {
  UploadCloud,
  FileText,
  Check,
  Loader2,
  Bot,
  User,
  Sparkles,
  X,
  Fingerprint,
  Globe,
  Link as LinkIcon,
  DownloadCloud,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "../components/Toast";

// --- REUSABLE UI COMPONENTS (Restored) ---

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-neutral-800">
    <Icon size={16} strokeWidth={1.5} className="text-neutral-500" />
    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-[0.2em]">
      {title}
    </h3>
  </div>
);

const ThinInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = "text",
  disabled = false,
}) => (
  <div className="group space-y-2 w-full">
    <label className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider ml-1 group-focus-within:text-neutral-400 transition-colors">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          strokeWidth={1.5}
          className="absolute left-0 top-3 text-neutral-700 group-focus-within:text-white transition-colors"
        />
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full bg-transparent border-b border-neutral-800 py-2.5 text-sm font-light text-neutral-200 
          placeholder:text-neutral-800 focus:border-neutral-500 focus:outline-none transition-all
          ${Icon ? "pl-6" : "pl-1"}
          ${disabled ? "cursor-not-allowed opacity-50" : ""}
        `}
      />
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export default function CreateAgent() {
  const { addToast } = useToast();

  // 1. STATE MANAGEMENT
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    behaviour: "",
    role: "",
  });
  const [files, setFiles] = useState([]);

  // Link State
  const [links, setLinks] = useState([]);
  const [currentLink, setCurrentLink] = useState("");
  const [currentLinkText, setCurrentLinkText] = useState("");
  const [isFetchingLink, setIsFetchingLink] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // 2. HANDLERS

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files)
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

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
      addToast("Could not fetch automatically. Paste text manually.", "error");
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

  const removeLink = (index) =>
    setLinks((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.behaviour)
      return addToast("Name & Behavior required", "error");

    setLoading(true);
    try {
      setStatusMsg("Reading Files & Analyzing Images...");
      const fileKnowledge = await processFiles(files);

      setStatusMsg("Compiling Web Data...");
      const linkKnowledge = links
        .map((l) => `\n\n=== SOURCE: WEB LINK (${l.url}) ===\n${l.content}`)
        .join("");

      const fullKnowledgeBase = `${fileKnowledge}\n${linkKnowledge}`;

      setStatusMsg("Deploying Agent...");
      await addDoc(collection(db, "agents"), {
        ...formData,
        knowledgeBase: fullKnowledgeBase,
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

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-black text-neutral-200 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <header className="mb-12 space-y-1">
          <h1 className="text-2xl font-thin tracking-tight text-white">
            Construct Multi-Modal Agent
          </h1>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12"
        >
          {/* LEFT COLUMN: IDENTITY */}
          <div className="lg:col-span-7 space-y-10">
            <section>
              <SectionHeader icon={Fingerprint} title="AGENT IDENTITY" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <ThinInput
                  label="NAME"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Zara"
                  icon={Bot}
                />

                {/* --- RESTORED AGE FIELD --- */}
                <ThinInput
                  label="MODEL AGE"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="e.g. 25 "
                />

                <div className="md:col-span-2">
                  <ThinInput
                    label="PRIMARY ROLE"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="e.g. Data Analyst"
                    icon={User}
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="group space-y-2">
                <label className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider ml-1">
                   MODEL BEHAVIOUR 
                </label>
                <textarea
                  name="behaviour"
                  rows="6"
                  value={formData.behaviour}
                  onChange={handleInputChange}
                  placeholder="> Define personality, constraints, and operational mode..."
                  className="w-full bg-neutral-950/30 border border-neutral-800 p-4 text-sm font-mono font-light text-neutral-300 focus:border-neutral-600 outline-none resize-none transition-all placeholder:text-neutral-800"
                />
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: KNOWLEDGE SOURCES */}
          <div className="lg:col-span-5 flex flex-col gap-10">
            {/* 1. FILE UPLOAD SECTION */}
            <section>
              <SectionHeader icon={FileText} title="FILE KNOWLEDGE" />
              <label
                className={`
                  w-full min-h-[120px] border border-dashed rounded-sm cursor-pointer transition-all duration-300
                  flex flex-col items-center justify-center relative overflow-hidden group mb-4
                  ${files.length > 0 ? "border-emerald-500/30 bg-emerald-950/5" : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/20"}
                `}
              >
                <div className="z-10 flex flex-col items-center text-neutral-700 group-hover:text-neutral-400 transition-colors">
                  <div className="flex gap-2 mb-3">
                    <UploadCloud size={24} strokeWidth={1} />
                    <ImageIcon size={24} strokeWidth={1} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-center">
                    Upload PDFs, Text & Images
                  </span>
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.json,.png,.jpg,.jpeg,.docx,.xlsx,.csv,.md,.js"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Minimal File List */}
              <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center px-2 py-2 border-b border-neutral-900/50 text-[10px] text-neutral-400"
                  >
                    <span className="truncate max-w-[200px] flex items-center gap-2">
                      {f.type.includes("image") ? (
                        <ImageIcon size={10} className="text-purple-500" />
                      ) : (
                        <FileText size={10} className="text-blue-500" />
                      )}
                      {f.name}
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-neutral-600 hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. WEB LINKS SECTION */}
            <section>
              <SectionHeader icon={Globe} title="WEB KNOWLEDGE" />

              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <ThinInput
                      label="URL"
                      value={currentLink}
                      onChange={(e) => setCurrentLink(e.target.value)}
                      placeholder="https://..."
                      icon={Globe}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchLinkContent}
                    disabled={isFetchingLink || !currentLink}
                    className="mb-[1px] p-2.5 border-b border-neutral-700 text-neutral-400 hover:text-white hover:border-white transition-colors"
                  >
                    {isFetchingLink ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <DownloadCloud size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>

                <div className="relative group">
                  <textarea
                    rows="2"
                    value={currentLinkText}
                    onChange={(e) => setCurrentLinkText(e.target.value)}
                    placeholder="> Web content preview..."
                    className="w-full bg-transparent border-b border-neutral-800 py-2 text-[10px] font-mono text-neutral-400 placeholder:text-neutral-800 focus:border-neutral-500 outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    className="absolute right-0 bottom-2 text-[10px] uppercase tracking-wider text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                  >
                    <Plus size={10} /> Add Link
                  </button>
                </div>

                {/* Minimal Link List */}
                <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                  {links.map((l, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center px-2 py-2 border-b border-neutral-900/50 text-[10px] text-neutral-400"
                    >
                      <span className="truncate max-w-[200px] flex items-center gap-2">
                        <LinkIcon size={10} className="text-emerald-500" />{" "}
                        {l.url}
                      </span>
                      <button
                        onClick={() => removeLink(i)}
                        className="text-neutral-600 hover:text-red-400"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* DEPLOY BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`
                mt-auto w-full py-4 border text-xs uppercase tracking-[0.2em] transition-all duration-500
                flex items-center justify-center gap-3
                ${
                  loading
                    ? "border-neutral-800 text-neutral-600 cursor-not-allowed"
                    : "border-neutral-700 hover:border-white text-white hover:bg-white/5"
                }
              `}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} strokeWidth={1} />
              )}
              {loading ? statusMsg || "SYNTHESIZING..." : "DEPLOY AGENT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
