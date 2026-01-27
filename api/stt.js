import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Form parse failed" });
    }

    const audioFile =
      files.audio?.filepath
        ? files.audio
        : Array.isArray(files.audio)
        ? files.audio[0]
        : null;

    if (!audioFile?.filepath) {
      console.error("No audio file:", files);
      return res.status(400).json({ error: "No audio file received" });
    }

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.filepath),
        model: "whisper-1",
      });

      return res.json({ transcript: transcription.text });
    } catch (error) {
      console.error("Whisper error:", error);
      return res.status(500).json({ error: "Whisper failed" });
    }
  });
}
