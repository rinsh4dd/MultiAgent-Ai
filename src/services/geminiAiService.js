import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// 🚀 UPDATED: Prioritize models found in your logs
const MODELS_TO_TRY = [
  "gemini-2.0-flash",       // Stable & Fast (Try this first)
  "gemini-2.5-flash",       // Bleeding Edge
  "gemini-2.0-flash-lite",  // Lightweight fallback
  "gemini-pro"              // Oldest fallback
];

async function getGeminiResponse(userMessage, agent, chatHistory = [], imageBase64 = null) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  let lastError = null;

  // 🔄 AUTO-DISCOVERY LOOP
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      const knowledgeBase = agent.knowledgeBase || "No document provided.";

      const history = chatHistory.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content || msg.text || " " }],
      }));

      const systemInstruction = `
        You are ${agent.name}, a ${agent.role || "Assistant"}.
        Personality: ${agent.behaviour || "Helpful"}.
        KB: ${knowledgeBase}.
        RULES: Prefer KB. Be concise.
      `;

      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: systemInstruction }] },
          { role: "model", parts: [{ text: "Understood." }] },
          ...history,
        ],
      });

      // Build Request
      let parts = [];
      if (userMessage && userMessage.trim() !== "") parts.push({ text: userMessage });
      
      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64
          }
        });
      }

      if (parts.length === 0) throw new Error("EMPTY_REQUEST");

      const result = await chat.sendMessage(parts);
      const text = result.response.text();

      if (!text) throw new Error("EMPTY_RESPONSE");

      return text; 

    } catch (err) {
      lastError = err;
      // If 404, loop to next model.
    }
  }

  console.error("ALL MODELS FAILED. Switching to Groq.");
  throw lastError; 
}

// Fallback to Groq
async function getGroqResponse(userMessage, agent, chatHistory = []) {
  const systemPrompt = `You are ${agent.name}. Role: ${agent.role}. Personality: ${agent.behaviour}. KB: ${agent.knowledgeBase}`;
  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: userMessage || "(Image ignored)" }, 
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, temperature: 0.7 }),
  });

  if (!res.ok) throw new Error("GROQ_FAILED");
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function getAgentResponse(userMessage, agent, chatHistory = [], audioBase64 = null, imageBase64 = null) {
  try {
    return await getGeminiResponse(userMessage, agent, chatHistory, imageBase64);
  } catch (err) {
    return await getGroqResponse(userMessage, agent, chatHistory);
  }
}