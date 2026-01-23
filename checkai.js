const API_KEY = "AIzaSyDWquMdr-zfpKLkL-Pzy27gTAfK5JQ7wP4";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listGeminiModels() {
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("API Error:", data);
      return;
    }

    console.log("✅ Available Gemini Models:\n");

    data.models.forEach((model) => {
      console.log(`📌 ${model.name}`);
      console.log(`   Display Name : ${model.displayName}`);
      console.log(`   Description  : ${model.description}`);
      console.log(`   Methods      : ${model.supportedGenerationMethods.join(", ")}`);
      console.log("--------------------------------------------------");
    });
  } catch (err) {
    console.error("❌ Request failed:", err);
  }
}

listGeminiModels();
