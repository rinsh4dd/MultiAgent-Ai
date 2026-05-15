import { GoogleGenerativeAI } from "@google/generative-ai";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const MODEL_NAME = "gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

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
  const systemPrompt = `
    You are ${agent.name}.
    Role: ${agent.role || "Assistant"}.
    Age:${agent.age || "matured perso"}.
    Personality: ${agent.behaviour || "Helpful"}.
    Knowledge Base: ${agent.knowledgeBase || "None"}.
    
    Instructions:
    1. Answer strictly based on your role.
    2. Be concise.
    3. Never use emojis and like that replys
  `;

  const sanitizedHistory = sanitizeForLLM(chatHistory);
  
  try {
    return await getGroqResponse(userMessage, systemPrompt, sanitizedHistory);
  } catch (error) {
    console.error("Groq failed, falling back to Gemini:", error);
    return await getGeminiResponse(userMessage, systemPrompt, sanitizedHistory);
  }
}

/* ---------------- GEMINI CHAT ---------------- */
async function getGeminiResponse(userMessage, systemPrompt, chatHistory = []) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: systemPrompt
    });

    const history = chatHistory.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Something went wrong";
  }
}

/* ---------------- GROQ CHAT ---------------- */
async function getGroqResponse(userMessage, systemPrompt, sanitizedHistory = []) {
  if (!userMessage || !userMessage.trim()) {
    return "Please say or type something 🙂";
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...sanitizedHistory,
    { role: "user", content: userMessage }
  ];

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
}