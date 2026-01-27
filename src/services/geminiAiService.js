const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/* ---------------- SANITIZER ---------------- */
function sanitizeForLLM(messages = []) {
  return messages
    .filter(m => ["system", "user", "assistant"].includes(m.role))
    .map(m => ({
      role: m.role,
      // Ensure content is a string and not empty
      content: typeof m.content === "string" ? m.content.trim() : ""
    }))
    .filter(m => m.content.length > 0);
}

/* ---------------- MAIN ENTRY ---------------- */
export async function getAgentResponse(
  userMessage,
  agent,
  chatHistory = []
) {
  // We ignore audioBase64/imageBase64 here as Groq is text-only for now
  return await getGroqResponse(userMessage, agent, chatHistory);
}

/* ---------------- GROQ CHAT ---------------- */
async function getGroqResponse(userMessage, agent, chatHistory = []) {
  if (!userMessage || !userMessage.trim()) {
    return "Please say or type something 🙂";
  }

  const systemPrompt = `
    You are ${agent.name}.
    Role: ${agent.role || "Assistant"}.
    Age:${agent.age || "matured person"}.
    Personality: ${agent.behaviour || "Helpful"}.
    Knowledge Base: ${agent.knowledgeBase || "None"}.
    
    Instructions:
    1. Answer strictly based on your role.
    2. Be concise.
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...sanitizeForLLM(chatHistory),
    { role: "user", content: userMessage }
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Groq API failed");
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq Error:", error);
    return "I'm having trouble connecting to my brain (Groq). Please check the API Key.";
  }
}