import React, { useState } from "react";
import AgentList from "../components/CreateAgent/AgentList";
import CreateAgent from "./createAgent";

export default function AgentsPage() {
  const [view, setView] = useState("list"); // Default view is the list
  const [editingAgent, setEditingAgent] = useState(null);

  // Switch to Create Mode
  const handleCreate = () => {
    setEditingAgent(null);
    setView("form");
  };

  // Switch to Edit Mode (with data)
  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setView("form");
  };

  // Go back to List
  const handleBack = () => {
    setView("list");
    setEditingAgent(null);
  };

  return (
    <div className="min-h-screen bg-black">
      {view === "list" ? (
        <AgentList onCreate={handleCreate} onEdit={handleEdit} />
      ) : (
        <CreateAgent onBack={handleBack} initialData={editingAgent} />
      )}
    </div>
  );
}