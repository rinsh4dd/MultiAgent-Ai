import React from "react";
import Navbar from "../components/Navbar";

export default function Layout({ children, activeTab, setActiveTab }) {
  return (
    /* h-screen + overflow-hidden is key to keeping the Navbar fixed */
    <div className="flex flex-col h-screen bg-black text-neutral-200 selection:bg-emerald-500/30">
      
      {/* 1. Navbar Container - No more radial glow, just a clean border */}
      <header className="shrink-0 border-b border-neutral-900 bg-black/50 backdrop-blur-xl z-50">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      </header>

      {/* 2. Content Area - This fills exactly what's left */}
      <main className="flex-1 relative flex flex-col min-h-0">
        {children}
      </main>

    </div>
  );
}