import React from "react";
import { 
  Bot, User, UploadCloud, FileText, Globe, DownloadCloud, 
  Loader2, Plus, X, Image as ImageIcon, Link as LinkIcon, Eye 
} from "lucide-react";

// --- ATOM: THIN INPUT (Your existing style) ---
export const ThinInput = ({ label, name, value, onChange, placeholder, icon: Icon, type = "text", disabled = false }) => (
  <div className="group space-y-2 w-full">
    <label className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider ml-1 group-focus-within:text-neutral-400 transition-colors">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon size={16} strokeWidth={1.5} className="absolute left-0 top-3 text-neutral-700 group-focus-within:text-white transition-colors" />
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

// --- ATOM: SECTION HEADER ---
export const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-neutral-800">
    <Icon size={16} strokeWidth={1.5} className="text-neutral-500" />
    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-[0.2em]">
      {title}
    </h3>
  </div>
);

// --- COMPONENT: IDENTITY SECTION ---
export const IdentitySection = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
    <ThinInput
      label="NAME"
      name="name"
      value={formData.name}
      onChange={onChange}
      placeholder="e.g. Zara"
      icon={Bot}
    />
    <ThinInput
      label="MODEL AGE"
      name="age"
      value={formData.age}
      onChange={onChange}
      placeholder="e.g. 25"
    />
    <div className="md:col-span-2">
      <ThinInput
        label="PRIMARY ROLE"
        name="role"
        value={formData.role}
        onChange={onChange}
        placeholder="e.g. Data Analyst"
        icon={User}
      />
    </div>
  </div>
);

// --- COMPONENT: BEHAVIOUR SECTION ---
export const BehaviourSection = ({ value, onChange }) => (
  <div className="group space-y-2">
    <label className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider ml-1">
      MODEL BEHAVIOUR
    </label>
    <textarea
      name="behaviour"
      rows="6"
      value={value}
      onChange={onChange}
      placeholder="> Define personality, constraints, and operational mode..."
      className="w-full bg-neutral-950/30 border border-neutral-800 p-4 text-sm font-mono font-light text-neutral-300 focus:border-neutral-600 outline-none resize-none transition-all placeholder:text-neutral-800"
    />
  </div>
);

// --- COMPONENT: FILE KNOWLEDGE SECTION ---
export const FileKnowledgeSection = ({ files, onAdd, onRemove }) => (
  <>
    <label className={`
      w-full min-h-[120px] border border-dashed rounded-sm cursor-pointer transition-all duration-300
      flex flex-col items-center justify-center relative overflow-hidden group mb-4
      ${files.length > 0 ? "border-emerald-500/30 bg-emerald-950/5" : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/20"}
    `}>
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
        onChange={onAdd}
        className="hidden"
      />
    </label>

    <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
      {files.map((f, i) => (
        <div key={i} className="flex justify-between items-center px-2 py-2 border-b border-neutral-900/50 text-[10px] text-neutral-400">
          <span className="truncate max-w-[200px] flex items-center gap-2">
            {f.type.includes("image") ? <ImageIcon size={10} className="text-purple-500" /> : <FileText size={10} className="text-blue-500" />}
            {f.name}
          </span>
          <button type="button" onClick={() => onRemove(i)} className="text-neutral-600 hover:text-red-400">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  </>
);

// --- COMPONENT: WEB KNOWLEDGE SECTION ---
export const WebKnowledgeSection = ({ 
  links, 
  currentLink, 
  currentLinkText, 
  isFetching, 
  onLinkChange, 
  onContentChange, 
  onFetch, 
  onAdd, 
  onRemove, 
  onPreview 
}) => (
  <div className="space-y-4">
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <ThinInput
          label="URL"
          value={currentLink}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="https://..."
          icon={Globe}
        />
      </div>
      <button
        type="button"
        onClick={onFetch}
        disabled={isFetching || !currentLink}
        className="mb-[1px] p-2.5 border-b border-neutral-700 text-neutral-400 hover:text-white hover:border-white transition-colors"
      >
        {isFetching ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} strokeWidth={1.5} />}
      </button>
    </div>

    <div className="relative group">
      <textarea
        rows="2"
        value={currentLinkText}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="> Web content preview..."
        className="w-full bg-transparent border-b border-neutral-800 py-2 text-[10px] font-mono text-neutral-400 placeholder:text-neutral-800 focus:border-neutral-500 outline-none resize-none pr-20 custom-scrollbar"
      />
      
      <div className="absolute right-0 bottom-2 flex items-center gap-3">
        {currentLinkText && (
          <button
            type="button"
            onClick={onPreview}
            className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Eye size={12} /> View
          </button>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="text-[10px] uppercase tracking-wider text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
        >
          <Plus size={10} /> Add Link
        </button>
      </div>
    </div>

    <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
      {links.map((l, i) => (
        <div key={i} className="flex justify-between items-center px-2 py-2 border-b border-neutral-900/50 text-[10px] text-neutral-400">
          <span className="truncate max-w-[200px] flex items-center gap-2">
            <LinkIcon size={10} className="text-emerald-500" /> {l.url}
          </span>
          <button type="button" onClick={() => onRemove(i)} className="text-neutral-600 hover:text-red-400">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  </div>
);