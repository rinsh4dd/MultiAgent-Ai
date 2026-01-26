import React from "react";
import Navbar from "../components/Navbar"; // Make sure path is correct

export default function Layout({ children, activeTab, setActiveTab }) {
  return (
    <div className="flex flex-col h-screen bg-black text-neutral-200 font-sans overflow-hidden selection:bg-emerald-500/30">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 relative flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}