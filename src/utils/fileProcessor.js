// import * as pdfjsLib from "pdfjs-dist";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
// pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // Helper: Convert File to Base64
// const fileToGenerativePart = async (file) => {
//   const base64EncodedDataPromise = new Promise((resolve) => {
//     const reader = new FileReader();
//     reader.onloadend = () => resolve(reader.result.split(',')[1]);
//     reader.readAsDataURL(file);
//   });
//   return {
//     inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
//   };
// };

// export const processFiles = async (files) => {
//   let combinedKnowledge = "";
//   const genAI = new GoogleGenerativeAI(API_KEY);
//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//   for (const file of files) {
    
//     // 1. PROCESS IMAGES (Using Gemini Vision)
//     if (file.type.startsWith("image/")) {
//       try {
//         const imagePart = await fileToGenerativePart(file);
//         // Ask Gemini to describe the image for the knowledge base
//         const result = await model.generateContent([
//           "Analyze this image in extreme detail. Transcribe any text, describe charts, data points, and visual elements exactly as they appear so I can use this as a text reference.", 
//           imagePart
//         ]);
//         const description = result.response.text();
//         combinedKnowledge += `\n\n=== SOURCE: IMAGE (${file.name}) ===\n[Image Analysis]: ${description}`;
//       } catch (err) {
//         console.error("Vision Error:", err);
//         combinedKnowledge += `\n\n(Error reading image ${file.name})\n`;
//       }
//     }

//     // 2. PROCESS PDFs
//     else if (file.type === "application/pdf") {
//       try {
//         const arrayBuffer = await file.arrayBuffer();
//         const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
//         let pdfText = `\n\n=== SOURCE: PDF (${file.name}) ===\n`;
//         for (let i = 1; i <= pdf.numPages; i++) {
//           const page = await pdf.getPage(i);
//           const textContent = await page.getTextContent();
//           pdfText += textContent.items.map((item) => item.str).join(" ") + " ";
//         }
//         combinedKnowledge += pdfText;
//       } catch (err) {
//         combinedKnowledge += `\n\n(Error reading PDF ${file.name})\n`;
//       }
//     }

//     // 3. PROCESS TEXT FILES
//     else if (file.type === "text/plain" || file.type === "application/json") {
//         const text = await file.text();
//         combinedKnowledge += `\n\n=== SOURCE: TEXT (${file.name}) ===\n${text}`;
//     }
//   }

//   return combinedKnowledge;
// };


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
  let combinedKnowledge = "";
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // 🔄 RETRY WRAPPER: Handles "503 Overloaded" errors automatically
  const generateWithRetry = async (promptParts) => {
    let attempts = 0;
    while (attempts < 3) {
      try {
        console.log(`AI call attempt ${attempts + 1} for prompt parts:`, promptParts);
        return await model.generateContent(promptParts);
      } catch (e) {
        attempts++;
        console.error(`AI call failed (Attempt ${attempts}):`, e);
        // If it's a 503 (Server Busy) and we have retries left
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

  console.log(`Processing ${files.length} files...`);

  for (const file of files) {
    const fileHeader = `\n\n=== SOURCE: ${file.name} ===\n`;

    try {
      // 1. IMAGES (Use Vision AI)
      if (file.type.startsWith("image/")) {
        const imagePart = await fileToGenerativePart(file);
        const result = await generateWithRetry([
          "Analyze this image in detail. Transcribe text and describe visual elements.", 
          imagePart
        ]);
        combinedKnowledge += `${fileHeader}[Image Analysis]: ${result.response.text()}`;
      }

      // 2. PDFs (Use pdf.js)
      else if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let pdfText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          pdfText += textContent.items.map((item) => item.str).join(" ") + " ";
        }
        combinedKnowledge += `${fileHeader}${pdfText}`;
      }

      // 3. WORD DOCUMENTS (.docx)
      else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        combinedKnowledge += `${fileHeader}${result.value}`;
      }

      // 4. EXCEL SHEETS (.xlsx, .csv)
      else if (
        file.type.includes("sheet") || 
        file.type.includes("excel") || 
        file.type.includes("csv")
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        let sheetText = "";
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            sheetText += `--- Sheet: ${sheetName} ---\n`;
            sheetText += XLSX.utils.sheet_to_txt(sheet);
        });
        combinedKnowledge += `${fileHeader}${sheetText}`;
      }

      // 5. PLAIN TEXT / CODE (.txt, .js, .json, .md)
      else if (file.type.startsWith("text/") || file.name.endsWith(".json") || file.name.endsWith(".js") || file.name.endsWith(".md")) {
          const text = await file.text();
          combinedKnowledge += `${fileHeader}${text}`;
      }

      // 6. UNIVERSAL FALLBACK (Try reading unknown files with AI)
      else {
          console.warn(`Unknown type: ${file.type}. Trying Gemini direct upload...`);
          const unknownPart = await fileToGenerativePart(file);
          const result = await generateWithRetry([
              "Read this file and extract all text and meaningful data.", 
              unknownPart
          ]);
          combinedKnowledge += `${fileHeader}[Extracted by AI]: ${result.response.text()}`;
      }

    } catch (err) {
      console.error(`Error processing ${file.name}:`, err);
      combinedKnowledge += `${fileHeader}(Error reading file: ${err.message})\n`;
    }
  }

  return combinedKnowledge;
};