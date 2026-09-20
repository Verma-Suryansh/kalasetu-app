# 🪷 KALA-MITRA (Kala-Setu) 
**Bridging Rural Artisans to National Markets via Multimodal AI & ONDC**

[![Deploy with Vercel](https://vercel.com/button)](https://kalasetu-app-pearl.vercel.app/)
![SIH 2026](https://img.shields.io/badge/Smart_India_Hackathon-2026-orange?style=for-the-badge)
![ONDC Protocol](https://img.shields.io/badge/ONDC-Beckn_Ready-blue?style=for-the-badge)

Kala-Mitra is an AI-powered, voice-guided Progressive Web App (PWA) designed to empower rural artisans and local cluster representatives. It bypasses digital literacy barriers by using multimodal AI to autonomously generate professional studio photography, multi-lingual SEO descriptions, and fair-market pricing from a single raw smartphone photo and a native-dialect voice note.

### 📌 Important Links
* **🔴 Live Prototype:** [Test the PWA here](https://kalasetu-app-pearl.vercel.app/)
* **📊 Pitch Deck:** [View our SIH Presentation](https://drive.google.com/file/d/1VLcEPIaYijoZMEDVhH7JU-VwZX0-KSIZ/view?usp=sharing)

---

## 🚀 The Problem & Solution
Current digital commerce platforms exclude non-tech-savvy rural artisans due to complex onboarding, language barriers, and exploitative commission structures. 

**Our Solution:**
1. **Voice-First Ingestion:** Representatives capture craft details using regional dialects (Hindi, Tamil, English).
2. **Autonomous Cataloging:** Edge AI pipelines transcribe audio, extract physical material costs, and generate e-commerce-ready bullet points.
3. **Studio Rendering:** Automated background removal and dynamic CSS composite lighting simulate high-end studio photography without the cost.
4. **Algorithmic Wage Protection:** A deterministic pricing engine prevents exploitation by calculating a strict baseline wage (Labor Hours × Standard Wage + Material Cost) before finalizing the ONDC network price.

---

## ⚙️ Technical Architecture
This vertical slice represents the core Edge Processing and AI Microservices pipeline.

* **Frontend:** HTML5, Tailwind CSS, JavaScript (PWA Ready)
* **API Gateway:** Vercel Serverless Functions (`Node.js`)
* **Vision & NLP Engine:** Meta Llama 3 / Qwen (via Groq API)
* **Image Processing:** Remove.bg API (Alpha mask extraction)
* **Network Serialization:** Custom Beckn Protocol JSON Adapter

---

## 🛠️ End-to-End Workflow Demonstrated
1. **Physical Ingestion:** Local rep selects artisan profile and snaps a raw product photo.
2. **Voice Note:** Rep speaks details (e.g., *"Took 4 days and 100 rupees material"*).
3. **AI Processing:** Pipeline translates dialect, extracts entities (Days → Hours), and renders the image against a studio backdrop.
4. **Approval & Serialization:** Rep adjusts cluster margins via UI slider. System validates fair-wage compliance and serializes data into a valid Beckn JSON payload for ONDC broadcasting.
5. **NPCI Settlement Simulator:** Built-in module demonstrating the 97% artisan / 3% representative direct-to-bank revenue split.

---

## 💻 Local Installation
To run this prototype locally for evaluation:

```bash
# Clone the repository
git clone [https://github.com/Verma-Suryansh/kalasetu-app.git](https://github.com/Verma-Suryansh/kalasetu-app.git)

# Navigate to the directory
cd kalasetu-app

# Add your environment variables in api/generate.js
# GROQ_API_KEY=your_key
# REMOVE_BG_API_KEY=your_key

# Deploy locally or via Vercel CLI
vercel dev
