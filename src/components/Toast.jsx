import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast Container (Renders the actual toasts) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Custom Hook for using the toast
export const useToast = () => useContext(ToastContext);

// Individual Toast UI Component
const ToastItem = ({ message, type, onClose }) => {
  const styles = {
    success: "border-emerald-500/50 bg-emerald-950/90 text-emerald-200",
    error: "border-red-500/50 bg-red-950/90 text-red-200",
    info: "border-cyan-500/50 bg-neutral-900/90 text-cyan-200",
  };

  const icons = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
  };

  return (
    <div
      className={`
      pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-md min-w-[300px]
      animate-in slide-in-from-right-full fade-in duration-300
      ${styles[type] || styles.info}
    `}
    >
      <div className="shrink-0">{icons[type] || icons.info}</div>
      <p className="flex-1 text-xs font-medium tracking-wide">{message}</p>
      <button
        onClick={onClose}
        className="opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
};
