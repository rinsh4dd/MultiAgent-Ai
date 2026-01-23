import axios from "axios";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY; 
const TTS_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

export const playGoogleVoice = async (text) => {
  if (!text) return;

  try {
    const response = await axios.post(TTS_ENDPOINT, {
      input: { text: text },
      voice: { 
        languageCode: "en-US", 
        // "Journey" voices are the new "Gemini" style voices (Expressive)
        // If Journey fails in your region, Neural2 is the fallback high-quality one.
        name: "en-US-Journey-F", 
        ssmlGender: "FEMALE" 
      },
      audioConfig: { 
        audioEncoding: "MP3",
        speakingRate: 1.0, // Normal speed
        pitch: 0.0 // Natural pitch
      }
    });

    const audioContent = response.data.audioContent;
    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
    audio.play();
    return audio;

  } catch (error) {
    console.error("Voice Error:", error);
    // Fallback to Neural2 if Journey isn't enabled for your key
    fallbackVoice(text); 
  }
};

const fallbackVoice = async (text) => {
    try {
        const response = await axios.post(TTS_ENDPOINT, {
            input: { text: text },
            voice: { languageCode: "en-US", name: "en-US-Neural2-F", ssmlGender: "FEMALE" },
            audioConfig: { audioEncoding: "MP3" }
        });
        const audio = new Audio(`data:audio/mp3;base64,${response.data.audioContent}`);
        audio.play();
    } catch (e) { console.error("Fallback failed", e); }
}