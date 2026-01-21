const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const getAgentResponse = async (
  userMessage,
  agent,
  chatHistory = [],
) => {
  const historyContext = agent.knowledgeBase
    ? `=== KNOWLEDGE BASE (Document) ===\n${agent.knowledgeBase}`
    : "No document provided.";

  const systemPrompt = `
You are an AI Agent.
Name: ${agent.name}
Age: ${agent.age || "Unknown"}
Role: ${agent.role || "assistant"}
Personality/Behavior: ${agent.behaviour}

INSTRUCTIONS:
- Respond strictly based on your personality and the Knowledge Base below.
- If the answer is not in the Knowledge Base, rely on your general knowledge but mention you are unsure.
- Keep responses concise and human-like.

${historyContext}
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: userMessage },
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (e) {
    console.error("Groq Error:", e);
    return "I’m having trouble connecting right now.";
  }
};
