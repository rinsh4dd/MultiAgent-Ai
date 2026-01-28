import React from "react";

export default function FormattedMessage({ text }) {
  if (!text) return null;

  // Split the text by bold markers (e.g., **bold text**)
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <div className="text-sm font-light leading-relaxed whitespace-pre-wrap text-neutral-300">
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="text-white font-medium">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Render regular text
        return part;
      })}
    </div>
  );
}