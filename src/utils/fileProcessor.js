import * as pdfjsLib from "pdfjs-dist";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as mammoth from "mammoth"; // For Word Docs
import * as XLSX from "xlsx";       // For Excel Sheets
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fileToGenerativePart = async (file) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const processFiles = async (files) => {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generateWithRetry = async (promptParts) => {
    let attempts = 0;
    while (attempts < 3) {
      try {
        console.log(`AI call attempt ${attempts + 1} for prompt parts:`, promptParts);
        return await model.generateContent(promptParts);
      } catch (e) {
        attempts++;
        console.error(`AI call failed (Attempt ${attempts}):`, e);
        if (e.message.includes("503") && attempts < 3) {
          console.warn(`Model overloaded. Retrying in 2 seconds... (Attempt ${attempts})`);
          await delay(2000 * attempts); 
          continue;
        }
        throw e;
      }
    }
    throw new Error("AI Service is too busy. Please try again later.");
  };

  const processedFiles = [];
  console.log(`Processing ${files.length} files...`);

  for (const file of files) {
    let fileContent = "";
    try {
      if (file.type.startsWith("image/")) {
        const imagePart = await fileToGenerativePart(file);
        const result = await generateWithRetry([
          "Analyze this image in detail. Transcribe text and describe visual elements.", 
          imagePart
        ]);
        fileContent = `[Image Analysis]: ${result.response.text()}`;
      }
      else if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let pdfText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          pdfText += textContent.items.map((item) => item.str).join(" ") + " ";
        }
        fileContent = pdfText;
      }
      else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        fileContent = result.value;
      }
      else if (file.type.includes("sheet") || file.type.includes("excel") || file.type.includes("csv")) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        let sheetText = "";
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            sheetText += `--- Sheet: ${sheetName} ---\n`;
            sheetText += XLSX.utils.sheet_to_txt(sheet);
        });
        fileContent = sheetText;
      }
      else if (file.type.startsWith("text/") || file.name.endsWith(".json") || file.name.endsWith(".js") || file.name.endsWith(".md")) {
          fileContent = await file.text();
      }
      else {
          const unknownPart = await fileToGenerativePart(file);
          const result = await generateWithRetry([
              "Read this file and extract all text and meaningful data.", 
              unknownPart
          ]);
          fileContent = `[Extracted by AI]: ${result.response.text()}`;
      }
      processedFiles.push({ name: file.name, content: fileContent });
    } catch (err) {
      console.error(`Error processing ${file.name}:`, err);
      processedFiles.push({ name: file.name, content: `(Error reading file: ${err.message})` });
    }
  }
  return processedFiles;
};