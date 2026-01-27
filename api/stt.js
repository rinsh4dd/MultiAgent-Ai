import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  try {
    const form = formidable({
      multiples: false,
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);

    const audio =
      Array.isArray(files.audio) ? files.audio[0] : files.audio;

    if (!audio?.filepath) {
      console.error("No audio file:", files);
      return res.status(400).json({ error: "No audio file received" });
    }

    const stream = fs.createReadStream(audio.filepath);

    const transcription = await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1"
    });

    // Clean up temp file (important on Vercel)
    fs.unlinkSync(audio.filepath);

    return res.status(200).json({
      transcript: transcription.text
    });

  } catch (err) {
    console.error("STT ERROR:", err);
    return res.status(500).json({
      error: "Whisper failed",
      details: err.message
    });
  }
}
