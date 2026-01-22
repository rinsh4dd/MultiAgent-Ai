import { GoogleGenerativeAI } from "@google/generative-ai";

// ENV
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/* ==================== GEMINI ==================== */
async function getGeminiResponse(userMessage, agent, chatHistory = []) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", // ✅ free-tier safe
  });

  const knowledgeBase = agent.knowledgeBase || "No document provided.";

  const history = chatHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content || msg.text }],
  }));

  const systemInstruction = `
You are an AI Agent named "${agent.name}".
Role: ${agent.role || "Assistant"}
Personality: ${agent.behaviour}

KNOWLEDGE BASE:
${knowledgeBase}

RULES:
- Prefer the knowledge base.
- If missing, say you don’t know.
- Keep it concise.
`;

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: "Understood." }] },
      ...history,
    ],
    generationConfig: {
      maxOutputTokens: 800,
    },
  });

  const result = await chat.sendMessage(userMessage);
  const response = result?.response;

  // 🔥 CRITICAL: Gemini can fail silently
  const text = response?.text?.();

  if (!text || text.trim().length === 0) {
    throw new Error("GEMINI_EMPTY_OR_BLOCKED");
  }

  return text;
}

/* ==================== GROQ (FALLBACK) ==================== */
async function getGroqResponse(userMessage, agent, chatHistory = []) {
  const systemPrompt = `
You are an AI Agent named "${agent.name}".
Role: ${agent.role || "Assistant"}
Personality: ${agent.behaviour}

KNOWLEDGE BASE:
${agent.knowledgeBase || "No document provided."}

RULES:
- Be concise
- Say when unsure
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: userMessage },
  ];

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
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
    }
  );

  if (!res.ok) {
    throw new Error("GROQ_FAILED");
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/* ==================== PUBLIC API ==================== */
export async function getAgentResponse(
  userMessage,
  agent,
  chatHistory = []
) {
  try {
    // 1️⃣ Try Gemini first
    return await getGeminiResponse(userMessage, agent, chatHistory);
  } catch (err) {
    console.warn("Gemini failed → fallback to Groq", err);

    // 2️⃣ Guaranteed fallback
    return await getGroqResponse(userMessage, agent, chatHistory);
  }
}
