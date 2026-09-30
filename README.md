# Paper to Test 📝⚡

> **Turn Question-Paper PDFs into Interactive Computer-Based (CBT) Mock Tests in Seconds. 100% Client-Side, Zero Server Required.**

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen)](https://merothiya.github.io/paper-to-test/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies at Runtime](https://img.shields.io/badge/Runtime-Offline%20HTML-blueviolet)]()

## 🌟 Overview

**Paper to Test** is a web-based examination platform that extracts questions, options, answers, and images from exam PDFs, provides a question editor with an automated quality audit engine, and exports single-file standalone HTML tests that run anywhere offline.

Multiple users can access the website simultaneously without interference: each user's test session, answers, and progress are stored entirely in their own browser (`localStorage` / `sessionStorage`).

---

## 🚀 Live Demo

👉 **[Launch Paper to Test on GitHub Pages](https://merothiya.github.io/paper-to-test/)**

*(Click **"⚡ Try Demo Exam"** to instantly test the simulator with a full 200-question medical entrance exam without uploading anything!)*

---

## ✨ Features

- **⚡ Instant 1-Click Demo:** Built-in 200 MCQ INI CET exam with 19 subjects, answer keys, and explanations.
- **📄 Multi-Column & Scanned PDF Parsing:**
  - Auto-detects 1-column, 2-column, and 3-column layouts.
  - Multi-line option joining and horizontal inline options `(A)... (B)... (C)... (D)...`.
  - Built-in OCR engine powered by **Tesseract.js** for scanned documents.
- **🎮 Live Interactive CBT Test Simulator:**
  - Real-time countdown exam timer with auto-submit on expiry.
  - Question navigation palette (Answered, Marked for Review, Not Visited, Current).
  - Quick keyboard shortcuts (`A`-`E`, `1`-`5` to select options, `N`/`P` for Next/Prev, `M` for Mark, `C` for Clear).
  - Subject-wise filtering and performance metrics.
- **👥 Multi-User & Shared Device Friendly:**
  - Candidate details entry (Name and Roll/Student ID).
  - Resume prompt for ongoing attempts with zero data collisions.
  - Instant **"🔄 Retake Test / New Candidate"** button.
  - **"🖨️ Print / Save Scorecard"** for generating clean PDF report cards.
  - **"📋 Copy Summary"** to easily paste scores into messages or emails.
- **🔍 Quality Audit & Integrity Dashboard:**
  - Checks numbering continuity (detects missing questions or duplicates).
  - Option count histogram and empty option detection.
  - Answer key coverage validation.
  - Cross-checks stems for figure references (`diagram`, `image`, `figure`, `shown below`) against attached image crops.
- **📦 Single-File Offline Export:**
  - Click **"⬇ Download test.html"** to export an ultra-compact (~13 KB) self-contained exam file.
  - Distribute via email, WhatsApp, or host on any static web host. No server or internet connection required to take the test.

---

## 🛠️ Usage

### Online:
1. Visit [https://merothiya.github.io/paper-to-test/](https://merothiya.github.io/paper-to-test/)
2. Choose your Question Paper PDF (and optional separate Answer Key PDF or paste answers).
3. Set your exam title and duration (minutes).
4. Click **"Build test"** (or click **"⚡ Try Demo Exam"**).
5. Take the exam right away in the Interactive Player, make edits in the Question Editor, or download `test.html`.

### Local Execution:
Simply clone this repository and open `index.html` in any modern web browser:
```bash
git clone https://github.com/Merothiya/paper-to-test.git
cd paper-to-test
# Open index.html in your browser
```

---

## 🧪 Testing & Verification

The parser and key-mapping algorithms are tested with automated test suites:
```bash
npm install
node test_keys.js   # Unit tests for key parsing, length checks & shift protections
node harness.js     # Full 89-page exam parser verification
```

---

## 🔒 Privacy & Security

Everything runs **100% locally in your browser**. No PDFs, images, questions, or candidate answers are ever transmitted to any external server.
