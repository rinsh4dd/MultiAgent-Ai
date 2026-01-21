import { useState } from "react";
import CreateAgent from "./pages/createAgent";
import Chat from "./pages/chat";
import Layout from "./Layouts/mainLayout";

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "chat" ? (
        <div className="flex-1 h-full animate-in fade-in duration-300">
          <Chat />
        </div>
      ) : (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-2 duration-300">
          <CreateAgent />
        </div>
      )}
    </Layout>
  );
}
