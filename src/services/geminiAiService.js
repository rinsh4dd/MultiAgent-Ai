// import { GoogleGenerativeAI } from "@google/generative-ai";

// const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
// const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// // 🚀 MODELS PRIORITY LIST
// const MODELS_TO_TRY = [
//   "gemini-2.0-flash",       // Newest, fast, supports images/audio
// ];

// /**
//  * Main Function called by Chat.jsx
//  */
// export async function getAgentResponse(userMessage, agent, chatHistory = [], audioBase64 = null, imageBase64 = null) {
//   try {
//     // 1. Try Google Gemini (Multimodal)
//     return await getGeminiResponse(userMessage, agent, chatHistory, imageBase64);
//   } catch (err) {
//     console.warn("Gemini Failed, switching to Groq...", err);
//     return await getGroqResponse(userMessage, agent, chatHistory);
//   }
// }

// // --- GEMINI LOGIC ---
// async function getGeminiResponse(userMessage, agent, chatHistory = [], imageBase64 = null) {
//   const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
//   let lastError = null;

//   // 🔄 Model Fallback Loop
//   for (const modelName of MODELS_TO_TRY) {
//     try {
//       const model = genAI.getGenerativeModel({ model: modelName });

//       // 1. Prepare System Instruction
//       const systemPrompt = `
//         You are ${agent.name}.
//         Role: ${agent.role || "AI Assistant"}.
//         Personality: ${agent.behaviour || "Helpful and concise"}.
//         Knowledge Base: ${agent.knowledgeBase || "No specific documents."}.
        
//         INSTRUCTIONS:
//         1. Answer based on your Knowledge Base first.
//         2. Be concise and human-like.
//         3. Do not mention you are an AI unless asked.
//       `;
 
//       // 2. Convert Chat History for Gemini format
//       // Gemini expects: { role: "user" | "model", parts: [{ text: "..." }] }
//       const history = chatHistory.map((msg) => ({
//         role: msg.role === "assistant" ? "model" : "user",
//         parts: [{ text: msg.content || " " }], // Ensure text is never empty
//       }));

//       // 3. Start Chat Session
//       const chat = model.startChat({
//         history: [
//           { role: "user", parts: [{ text: systemPrompt }] },
//           { role: "model", parts: [{ text: "Understood. I am ready." }] },
//           ...history,
//         ],
//       });

//       // 4. Construct Current Message Payload
//       let parts = [];
      
//       // Add Text (if present)
//       if (userMessage && userMessage.trim()) {
//         parts.push({ text: userMessage });
//       }

//       // Add Image (if present)
//       if (imageBase64) {
//         parts.push({
//           inlineData: {
//             // Note: Simplification. For production, pass strict mimeType from UI if possible.
//             mimeType: "image/jpeg", 
//             data: imageBase64
//           }
//         });
//       }

//       // Guard: If both empty (rare), send a placeholder to avoid crash
//       if (parts.length === 0) parts.push({ text: "..." });

//       // 5. Send Message
//       const result = await chat.sendMessage(parts);
//       const responseText = result.response.text();

//       if (!responseText) throw new Error("Empty response from Gemini");

//       return responseText;

//     } catch (err) {
//       console.error(`Error with model ${modelName}:`, err.message);
//       lastError = err;
//       // Continue loop to try next model...
//     }
//   }

//   // If loop finishes without success
//   throw lastError || new Error("All Gemini models failed.");
// }

// // --- GROQ FALLBACK (Text Only) ---
// async function getGroqResponse(userMessage, agent, chatHistory = []) {
//   const systemPrompt = `You are ${agent.name}, a ${agent.role}. Personality: ${agent.behaviour}. Knowledge: ${agent.knowledgeBase}`;
  
//   // Groq doesn't support images yet in this implementation
//   const content = userMessage || "(User sent an image/audio which Groq cannot process)";

//   const messages = [
//     { role: "system", content: systemPrompt },
//     ...chatHistory,
//     { role: "user", content: content },
//   ];

//   const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: { 
//       "Authorization": `Bearer ${GROQ_API_KEY}`, 
//       "Content-Type": "application/json" 
//     },
//     body: JSON.stringify({ 
//       model: "llama-3.1-8b-instant", // Fast & Cheap
//       messages, 
//       temperature: 0.7 
//     }),
//   });

//   if (!res.ok) {
//     const errData = await res.json();
//     throw new Error(`Groq API Error: ${errData.error?.message || res.statusText}`);
//   }

//   const data = await res.json();
//   return data.choices[0].message.content;
// }











// geminiAiService.js (FINAL – Groq ONLY)

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/* ---------------- SANITIZER (IMPORTANT) ---------------- */
function sanitizeForLLM(messages = []) {
  return messages
    .filter(m => ["system", "user", "assistant"].includes(m.role))
    .map(m => ({
      role: m.role,
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
Personality: ${agent.behaviour || "Helpful"}.
Knowledge Base: ${agent.knowledgeBase || "None"}.
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...sanitizeForLLM(chatHistory),
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
