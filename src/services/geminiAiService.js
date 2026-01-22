import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

async function getGeminiResponse(userMessage, agent, chatHistory = []) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
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
- Prefer the knowledge base and dont expose like this is my knowledge base or knowledge base word
- If missing, say you don’t know
- Be concise
`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Understood." }] },
        ...history,
      ],
      generationConfig: { maxOutputTokens: 800 },
    });

    const result = await chat.sendMessage(userMessage);
    const response = result?.response;

    const text = response?.text?.();
    const feedback = response?.promptFeedback;
    const candidate = response?.candidates?.[0];

    if (
      !text ||
      text.trim() === "" ||
      feedback?.blockReason ||
      candidate?.finishReason === "SAFETY"
    ) {
      throw new Error("GEMINI_BLOCKED_OR_EMPTY");
    }

    return text;
  } catch (err) {
    const msg = err?.message || "";

    if (
      msg.includes("429") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("quota") ||
      msg.includes("GEMINI_")
    ) {
      throw new Error("GEMINI_UNAVAILABLE");
    }

    throw err;
  }
}

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

export async function getAgentResponse(
  userMessage,
  agent,
  chatHistory = []
) {
  try {
    return await getGeminiResponse(userMessage, agent, chatHistory);
  } catch (err) {
    console.warn("⚠️ Gemini unavailable → switching to Groq");
    return await getGroqResponse(userMessage, agent, chatHistory);
  }
}
