import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import * as pdfjsLib from "pdfjs-dist";
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
} from "lucide-react";
import { useToast } from "../components/Toast";
// pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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
}) => (
  <div className="group space-y-2">
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
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          w-full bg-transparent border-b border-neutral-800 py-2.5 text-sm font-light text-neutral-200 
          placeholder:text-neutral-800 focus:border-neutral-500 focus:outline-none transition-all
          ${Icon ? "pl-6" : "pl-1"}
        `}
      />
    </div>
  </div>
);

// --- Main Component ---

export default function CreateAgent() {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    behaviour: "",
    role: "",
  });
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) setDocument(e.target.files[0]);
  };

  const removeFile = (e) => {
    e.preventDefault();
    setDocument(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.behaviour || !formData.role || !document) {
      addToast("Please fill in all fields.", "error");
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await document.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(" ") + " ";
      }

      await addDoc(collection(db, "agents"), {
        ...formData,
        documentName: document.name,
        knowledgeBase: fullText,
        createdAt: new Date(),
      });

      addToast("Agent Deployed Successfully!", "success");
      setFormData({ name: "", age: "", behaviour: "", role: "" });
      setDocument(null);
    } catch (error) {
      addToast("Deployment Failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-200 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <header className="mb-12 space-y-1">
          <h1 className="text-2xl font-thin tracking-tight text-white">
            Create New Agent
          </h1>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12"
        >
          <div className="lg:col-span-7 space-y-10">
            <section>
              <SectionHeader icon={Fingerprint} title="AGENT DETAILS" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <ThinInput
                  label="NAME"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Zara"
                  icon={Bot}
                />
                <ThinInput
                  label="Model Age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="e.g. 25"
                />
                <div className="md:col-span-2">
                  <ThinInput
                    label="Primary Role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    placeholder="e.g. Data Analyst"
                    icon={User}
                  />
                </div>
              </div>
            </section>

            {/* Behaviour Section */}
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
                  placeholder="> Define personality and operational constraints..."
                  className="w-full bg-neutral-950/30 border border-neutral-800 p-4 text-sm font-mono font-light text-neutral-300 focus:border-neutral-600 outline-none resize-none transition-all placeholder:text-neutral-800"
                />
              </div>
            </section>
          </div>

          {/* Right Column: Upload & Submit */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {/* Upload Section */}
            <section className="flex-1 flex flex-col">
              <SectionHeader icon={FileText} title="Knowledge BASE" />

              <label
                className={`
                flex-1 w-full min-h-[200px] border border-dashed rounded-sm cursor-pointer transition-all duration-300
                flex flex-col items-center justify-center relative overflow-hidden group
                ${
                  document
                    ? "border-emerald-500/30 bg-emerald-950/5"
                    : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/20"
                }
              `}
              >
                {document ? (
                  <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <Check
                      size={24}
                      strokeWidth={1}
                      className="text-emerald-500 mb-3"
                    />
                    <span className="text-xs font-light text-emerald-100 tracking-wide">
                      {document.name}
                    </span>
                    <button
                      onClick={removeFile}
                      className="mt-4 text-[10px] text-neutral-600 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                      <X size={10} /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="z-10 flex flex-col items-center text-neutral-700 group-hover:text-neutral-400 transition-colors">
                    <UploadCloud size={32} strokeWidth={1} className="mb-4" />
                    <span className="text-xs uppercase tracking-widest">
                      Upload PDF
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </section>

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full py-4 border text-xs uppercase tracking-[0.2em] transition-all duration-500
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
              {loading ? "Processing..." : "CREATE Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
