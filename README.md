# CoursePilot

<p align="center">
  <img src="assets/icon.png" alt="CoursePilot Logo" width="128" height="128">
</p>

AI-powered course companion Chrome extension. Turns any online text-based course into an interactive, AI-tutored learning experience with quizzes, concept explanations, and mastery tracking.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/latest)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

- **🤖 AI-Generated Quizzes** - Automatically generate questions based on course content using Bloom's Taxonomy
- **💡 Instant Explanations** - Select any text to get instant explanations from the AI
- **📊 Progress Tracking** - Track your mastery across all course pages
- **🎧 Listen Mode** - Chat with AI about what you've read (no spoilers - it only sees content you've scrolled past)
- **🔌 Multiple AI Providers** - Choose from Anthropic, OpenAI, Google Gemini, or local AI gateways
- **📄 PDF Learning Portfolio** - Export a professional certificate + study report PDF using Foxit APIs
- **🔍 Web Research** - Research topics with You.com API for citations and grounding

## 🤝 Built with Kilo Code

This project was built entirely with **Kilo Code**, an AI-powered development agent. Here's how Kilo helped:

### How Kilo Helped

1. **Initial Analysis**: Kilo analyzed the existing codebase architecture, understanding the three-entrypoint pattern (Content Script, Background Worker, Side Panel) and the AI provider system

2. **Documentation Generation**: Kilo created comprehensive documentation including:
   - Developer documentation with architecture diagrams and API references
   - User documentation with getting started guides and FAQs
   - Enhanced README with features, troubleshooting, and project structure

3. **Code Understanding**: Kilo explored and documented:
   - The type-safe message protocol between components
   - The storage system using WXT storage
   - The pedagogy engine with Bloom's Taxonomy
   - The AI provider abstraction layer

### Why Kilo Was Valuable

- **Rapid onboarding**: Kilo quickly understood the complex Chrome extension architecture
- **Comprehensive docs**: Created documentation that would typically take hours
- **Pattern recognition**: Identified key patterns and conventions used in the codebase
- **Context preservation**: Maintained understanding across multiple file reads

This project demonstrates how Kilo Code can accelerate development by handling documentation tasks while developers focus on core functionality.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Chrome browser (for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd coursepilot

# Install dependencies
npm install

# Start development server
npm run dev
```

This builds the extension and opens a Chrome instance with it loaded. The side panel, content scripts, and background worker are all hot-reloaded on save.

### First-Time Setup

1. Click the extension icon in Chrome's toolbar (or press `Alt+Shift+C`)
2. Open the **Settings** tab in the side panel
3. Select your preferred AI provider
4. Enter your API key and click **Test** to verify the connection
5. Navigate to a course page and start learning!

## 📖 User Guide

### Starting a Quiz

1. Navigate to a course page
2. Read through the content (the extension extracts page content as you scroll)
3. When you see the "Ready for quiz?" FAB button, click it
4. The side panel opens with your generated quiz
5. Answer questions and track your mastery score

### Getting Explanations

1. Select any text on the course page
2. A popup appears with "💡 Explain this" button
3. Click to get an instant AI explanation in the Chat tab

### Using Listen Mode

1. Open the Chat tab in the side panel
2. Ask questions about what you've read
3. The AI only sees content you've scrolled past - no spoilers!

### Understanding Mastery

- **80% threshold** (configurable) to master a page
- Each hint used costs **-15%** from your score
- Progress is tracked per-page and overall

## 🔧 Development

### Available Commands

```bash
npm run dev              # Chrome with hot reload
npm run dev:firefox      # Firefox variant
npm run build            # Production build
npm run build:firefox   # Firefox production build
npm run zip             # Create Chrome .zip for store
npm run zip:firefox     # Create Firefox .zip
npm run check           # TypeScript type checking
npm run lint            # ESLint code linting
```

### Architecture Overview

```
Content Script (per tab)  ↔  Background Worker  ↔  Side Panel (React app)
      ↕                          ↕
  Host page DOM              AI Provider (pluggable)
```

### Project Structure

```
coursepilot/
├── entrypoints/
│   ├── background.ts           # AI proxy + message router
│   ├── content/                # Content script (ShadowRoot React UI)
│   │   ├── index.tsx          # defineContentScript + createShadowRootUi
│   │   ├── App.tsx            # FAB, SelectionPopup, scroll tracking
│   │   └── style.css          # Isolated styles (Tailwind v4)
│   └── sidepanel/              # Side panel React app
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx             # Tab router: Quiz | Chat | Progress | Settings
│       └── views/              # QuizView, ChatView, ProgressView, SettingsView
├── lib/
│   ├── ai/                    # AI provider implementations
│   │   ├── types.ts           # AIProvider interface
│   │   ├── anthropic-provider.ts
│   │   ├── openai-provider.ts
│   │   ├── gemini-provider.ts
│   │   ├── gateway-provider.ts
│   │   ├── provider-factory.ts
│   │   └── prompts/          # Quiz generation, answer eval, explanation
│   ├── context/               # Page content extraction
│   │   ├── page-extractor.ts
│   │   └── llms-txt-loader.ts
│   ├── navigation/           # Course detection
│   │   └── course-detector.ts
│   ├── messaging.ts         # Type-safe message protocol
│   └── types.ts             # All shared TypeScript types
├── hooks/
│   └── useAIStream.ts       # Port-based streaming hook
├── utils/
│   ├── storage.ts           # WXT storage definitions
│   └── streaming.ts         # SSE/NDJSON parsing
├── docs/                    # Documentation
│   ├── dev/                 # Developer documentation
│   └── user/                # User documentation
└── wxt.config.ts
```

### WXT Dev Mode Quirks

- **WXT owns the Chrome instance.** It launches a dedicated Chrome profile with the extension pre-loaded. Closing that Chrome window kills the dev server.
- **Port 3000 by default.** WXT's internal dev server uses port 3000. If you're also running a local course server, start the course on a different port.
- **Reopen browser:** Press `o` + `Enter` in the WXT terminal to reopen Chrome if you accidentally close it.
- **Service worker timeout:** The background script is a Manifest V3 service worker with a 30-second idle timeout. All state lives in `browser.storage`, never in memory.

## 🤖 AI Providers

| Provider | Model | Auth Method |
|---|---|---|
| Anthropic | Claude Sonnet 4.5 | API key header (`x-api-key`) |
| OpenAI | GPT-4o | Bearer token |
| Google | Gemini 3 Flash Preview | API key param |
| Local Gateway | Configurable | Bearer token (Ollama, LM Studio, etc.) |

Configure in the extension's Settings tab (side panel).

### Setting Up Local Gateway

For local AI models (Ollama, LM Studio, etc.):

1. Set provider to "Local Gateway"
2. Enter your gateway URL (default: `http://127.0.0.1:18789`)
3. Enter your API key if required
4. Click Test to verify

## 📄 Foxit PDF Learning Portfolio

CoursePilot uses **two Foxit APIs** to generate a professional Learning Portfolio PDF from your quiz data.

### How It Works

```
Learning Data → Word Templates + JSON → [Doc Gen API] → Certificate + Report PDFs
  → [PDF Services API: combine + compress] → Single optimized PDF → Download
```

1. **Data Collection** — Aggregates your quiz results, Bloom's Taxonomy performance (per cognitive level), mastery scores, missed questions, and AI chat insights from extension storage
2. **Document Generation API** — Populates two Word templates with your data:
   - **Certificate of Mastery** — Single-page certificate with course name, overall mastery score, Bloom's levels achieved, and completion date
   - **Detailed Study Report** — Multi-page report with page progress table, Bloom's Taxonomy performance breakdown, questions to review, and chat topic insights
3. **PDF Services API** — Merges both PDFs into one document, then compresses it for easy sharing

### Foxit APIs Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Document Generation** | `POST /document-generation/api/GenerateDocumentBase64` | Generates PDFs from `.docx` templates populated with learning data JSON |
| **PDF Services — Upload** | `POST /pdf-services/api/documents/upload` | Uploads generated PDFs for processing |
| **PDF Services — Combine** | `POST /pdf-services/api/documents/enhance/pdf-combine` | Merges certificate + report into a single PDF |
| **PDF Services — Compress** | `POST /pdf-services/api/documents/modify/pdf-compress` | Optimizes the final PDF file size |
| **PDF Services — Poll/Download** | `GET /pdf-services/api/tasks/{taskId}`, `GET /pdf-services/api/documents/{docId}/download` | Async task polling and final PDF download |

### What Makes This Unique

No other project has **Bloom's Taxonomy-based cognitive performance breakdowns** in their PDFs. The study report shows how you performed at each cognitive level (Remember → Understand → Apply → Analyze → Evaluate → Create), giving a real pedagogical assessment — not just a score.

### Setup

1. Open **Settings** in the CoursePilot side panel
2. Scroll to **Foxit PDF Services**
3. Enter your Document Generation and PDF Services credentials (client ID + secret for each)
4. Click **Test Connection** to verify both APIs
5. Take some quizzes, then go to **Progress** → **Export Learning Portfolio**

## 🛠 Built With

| Technology | Purpose |
|---|---|
| [WXT](https://wxt.dev/) | Chrome extension framework (Manifest V3, hot reload, React) |
| [React 19](https://react.dev/) | Side panel UI |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [Foxit Document Generation API](https://developers.foxit.com/) | Generates certificate + study report PDFs from Word templates |
| [Foxit PDF Services API](https://developers.foxit.com/) | Combines and compresses PDFs |
| [You.com API](https://you.com/platform) | Web research, citations, and news |
| [Anthropic / OpenAI / Gemini](https://docs.anthropic.com/) | Pluggable AI providers for quiz generation and explanations |

## 📝 Documentation

- **[User Documentation](docs/user/)** - Complete user guide
- **[Developer Documentation](docs/dev/)** - Architecture, contributing, API reference
- **[Agent Instructions](AGENTS.md)** - AI agent guidelines for development

## 🎓 Test Subject

The primary test course is the CCLI Monitor Docsify course at `../activity-monitor-for-ai-assitants/course/`. Start it with:

```bash
cd ../activity-monitor-for-ai-assitants/course
npx docsify-cli serve . --port 4000
```

Then navigate to `http://localhost:4000` in the WXT Chrome window.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

Built with [WXT](https://wxt.dev/) - The next-gen web extension framework
