import React, { useState, useEffect } from "react";

export default function FormattedMessage({ text, animate = false }) {
  const [displayedText, setDisplayedText] = useState(animate ? "" : text);
  const [isAnimating, setIsAnimating] = useState(animate);

  useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      setIsAnimating(false);
      return;
    }

    const isLargeResponse = text.length > 500;
    setIsAnimating(true);

    if (isLargeResponse) {
      // 🚀 CHUNKED APPEARANCE (5 lines at a time)
      const lines = text.split("\n");
      let currentLineCount = 0;
      const intervalId = setInterval(() => {
        currentLineCount += 5;
        if (currentLineCount >= lines.length) {
          setDisplayedText(text);
          setIsAnimating(false);
          clearInterval(intervalId);
        } else {
          setDisplayedText(lines.slice(0, currentLineCount).join("\n"));
        }
      }, 100); // Appear 5 lines every 100ms
      return () => clearInterval(intervalId);
    } else {
      // ⌨️ TYPEWRITER (Fast constant speed)
      let currentIndex = 0;
      const speed = 5;
      const intervalId = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          setIsAnimating(false);
          clearInterval(intervalId);
        }
      }, speed);
      return () => clearInterval(intervalId);
    }
  }, [text, animate]);

  if (!displayedText && !isAnimating) return null;

  // 🦴 SKELETON LOADER (While waiting for first chunk/character)
  if (!displayedText && isAnimating) {
    return (
      <div className="space-y-2 animate-pulse w-full max-w-sm">
        <div className="h-2 bg-neutral-800 rounded w-3/4"></div>
        <div className="h-2 bg-neutral-800 rounded w-full"></div>
        <div className="h-2 bg-neutral-800 rounded w-5/6"></div>
      </div>
    );
  }

  const parts = displayedText.split(/(\*\*.*?\*\*)/g);

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
        return part;
      })}
      {isAnimating && <span className="inline-block w-1 h-4 ml-1 bg-emerald-500 animate-pulse align-middle" />}
    </div>
  );
}