// services/ttsService.js

const TTS_BASE_URL = "http://localhost:8000/tts";

export async function speak(text, voiceProfile = "en_female_soft") {
  if (!text || !text.trim()) return null;

  try {
    const res = await fetch(
      `${TTS_BASE_URL}?text=${encodeURIComponent(text)}&profile=${voiceProfile}`
    );

    if (!res.ok) {
      console.error("TTS failed:", await res.text());
      return null;
    }

    const blob = await res.blob();

    // Safety: ensure audio
    if (!blob.type.startsWith("audio")) {
      console.error("TTS response is not audio");
      return null;
    }

    // ✅ Return audio URL (DO NOT play here)
    return URL.createObjectURL(blob);

  } catch (err) {
    console.error("TTS error:", err);
    return null;
  }
}
