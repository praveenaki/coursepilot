# AI Agent Instructions — CoursePilot

## Overview

CoursePilot is an AI-powered Chrome extension that turns any online text-based course into an interactive, AI-tutored learning experience. Built with WXT (React), it uses content scripts, a side panel, and a background worker to generate quizzes, explain concepts, and track mastery.

## Architecture

```
Content Script (per tab)  ↔  Background Worker  ↔  Side Panel (React app)
      ↕                          ↕
  Host page DOM              AI Provider (pluggable)
```

### Three Entrypoints

| Entrypoint | Purpose | Key Files |
|---|---|---|
| **Content Script** | Injects FAB, selection popup, extracts page content | `entrypoints/content/` |
| **Background Worker** | AI proxy, message router, storage coordinator | `entrypoints/background.ts` |
| **Side Panel** | Quiz UI, chat, progress tracking, settings | `entrypoints/sidepanel/` |

### Communication Pattern

- Content Script → `browser.runtime.sendMessage()` → Background Worker
- Side Panel → `browser.runtime.sendMessage()` → Background Worker
- Background → `browser.tabs.sendMessage()` → Content Script
- Streaming: Side Panel ↔ `browser.runtime.Port` ↔ Background (long-lived for AI responses)

### AI Provider System

4 pluggable providers, all implementing the same `AIProvider` interface with `AsyncGenerator<string>` streaming:

| Provider | Endpoint | Auth |
|---|---|---|
| Anthropic | `api.anthropic.com/v1/messages` | `x-api-key` header |
| OpenAI | `api.openai.com/v1/chat/completions` | Bearer token |
| Gemini | `generativelanguage.googleapis.com/v1beta/...` | API key param |
| Local Gateway | `localhost:PORT/v1/chat/completions` | Bearer token |

### State Management

All state in WXT storage (never in-memory):
- `sync:settings` — user preferences, synced across devices
- `local:apiKeys` — API keys, never synced
- `local:courses` — detected course structures
- `local:progress` — mastery per page per course
- `local:contextCache` — extracted page content
- `local:chatHistory` — listen mode conversations
- `local:quizHistory` — past quiz sessions

## Core Rules

### Development

0. **Use npm only** — not pnpm, not yarn
1. **Read before editing** — always understand context first
2. **Never install `@types/chrome`** — WXT provides its own types
3. **`return true`** in ALL async message handlers (or use Port)
4. **Shadow DOM** for content script UI — isolate from host page CSS
5. **Tailwind v4** — use `@theme` in CSS, NOT `tailwind.config.js` for colors
6. **Background is stateless** — 30s service worker timeout, use storage
7. **Port for streaming** — `browser.runtime.Port` for long-lived AI connections
8. **No direct content ↔ panel communication** — always through background

### Pedagogy Engine

- Bloom's Taxonomy levels: remember → understand → apply → analyze → evaluate → create
- Mastery threshold: 80% (configurable)
- Hint penalty: -15% per hint used
- Feynman technique: "Explain in your own words" questions

### Context Management

```
Total budget: 100K tokens
├── System prompts:    ~2K  (fixed)
├── llms.txt seed:     ~20K (if available)
├── Current page:      ~10K (full content)
├── Adjacent pages:    ~10K (prev + next)
├── Visited pages:     ~40K (summarized)
├── Chat history:      ~10K (current session)
└── Reserve:           ~8K  (AI response)
```

## Project Structure

```
coursepilot/
├── entrypoints/
│   ├── background.ts           # AI proxy + message router
│   ├── content/                # Content script (ShadowRoot React UI)
│   │   ├── index.tsx           # defineContentScript + createShadowRootUi
│   │   ├── App.tsx             # FAB, SelectionPopup, scroll tracking
│   │   └── style.css           # Isolated styles (Tailwind v4)
│   └── sidepanel/              # Side panel React app
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx             # Tab router: Quiz | Chat | Progress | Settings
│       └── views/              # QuizView, ChatView, ProgressView, SettingsView
├── lib/
│   ├── ai/
│   │   ├── types.ts            # AIProvider interface
│   │   ├── anthropic-provider.ts
│   │   ├── openai-provider.ts
│   │   ├── gemini-provider.ts
│   │   ├── gateway-provider.ts
│   │   ├── provider-factory.ts
│   │   └── prompts/            # Quiz generation, answer eval, explanation
│   ├── context/
│   │   ├── page-extractor.ts   # DOM → clean text
│   │   └── llms-txt-loader.ts  # Fetch /llms.txt
│   ├── navigation/
│   │   └── course-detector.ts  # Docsify, GitBook, generic detection
│   ├── messaging.ts            # Type-safe message protocol
│   └── types.ts                # All shared TypeScript types
├── hooks/
│   └── useAIStream.ts          # Port-based streaming hook
├── utils/
│   ├── storage.ts              # WXT storage definitions
│   └── streaming.ts            # SSE/NDJSON parsing
├── wxt.config.ts
└── package.json
```

## Conventions

- **File naming**: kebab-case for files, PascalCase for React components
- **Imports**: Use `@/` path alias for project root
- **Messages**: All typed via `lib/messaging.ts` union types
- **Storage**: Always through `utils/storage.ts` items, never raw `chrome.storage`

## Test Subject

The CCLI Monitor Docsify course at `../activity-monitor-for-ai-assitants/course/` is the primary test subject. An `llms.txt` has been created at the course root.
