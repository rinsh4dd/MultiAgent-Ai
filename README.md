<div align="center">

# 🤖 Multi-Agent AI Platform

**A sleek multi-agent AI chat system with custom personalities, knowledge bases, and real-time conversations.**

Built with **React + Vite**, **Firebase**, and **Groq LLMs**.  
Deployed on **Vercel**.

[🚀 Live Demo](#) · [📦 Deploy](#deployment) · [🧠 Features](#features)

</div>

---

## ✨ Features

- 🧠 **Multiple AI Agents**
  - Each agent has its own role, behavior, and knowledge base
- 📄 **PDF Knowledge Base Ingestion**
  - Upload PDFs → extracted → injected into agent context
- 💬 **Continuous Chat Memory**
  - Conversation history passed to the model for real continuity
- 🎨 **Minimal Dark UI**
  - Circular UI standard, developer-focused layout
- 🔔 **Toast Notifications**
  - Success / error feedback
- ☁️ **Serverless & Scalable**
  - Firebase + Vercel

---

## 🧱 Tech Stack

| Layer | Tech |
|-----|------|
| Frontend | React, Vite, Tailwind CSS |
| Icons | lucide-react |
| AI | Groq API (LLaMA 3.1) |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Hosting | Vercel |

---

## 📁 Project Structure

```txt
src/
├─ components/        # UI components (Toast, etc.)
├─ pages/             # Chat, Deploy Agent
├─ services/          # Groq AI service
├─ firebase.js        # Firebase config
├─ index.css
├─ main.jsx
└─ App.jsx
