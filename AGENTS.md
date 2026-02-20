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

| Provider | Endpoint | Auth | Default Model |
|---|---|---|---|
| Anthropic | `api.anthropic.com/v1/messages` | `x-api-key` header | `claude-sonnet-4-5-20250929` |
| OpenAI | `api.openai.com/v1/chat/completions` | Bearer token | `gpt-4o` |
| Gemini | `generativelanguage.googleapis.com/v1beta/...` | API key param | `gemini-3-flash-preview` |
| Local Gateway | `localhost:PORT/v1/chat/completions` | Bearer token | `default` |

### State Management

All state in WXT storage (never in-memory):

| Storage Key | Type | Description |
|---|---|---|
| `sync:settings` | `Settings` | User preferences, synced across devices |
| `local:apiKeys` | `Record<AIProviderType, string>` | API keys, never synced |
| `local:courses` | `Record<string, CourseInfo>` | Detected course structures |
| `local:progress` | `Record<string, CourseProgress>` | Mastery per page per course |
| `local:contextCache` | `Record<string, PageContext>` | Extracted page content |
| `local:chatHistory` | `Record<string, ChatSession>` | Listen mode conversations |
| `local:quizHistory` | `QuizSession[]` | Past quiz sessions |

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

## Message Protocol

All communication flows through background. See [`lib/messaging.ts`](lib/messaging.ts) for complete types.

### Content → Background Messages

```typescript
{ type: 'PAGE_CONTENT_EXTRACTED', payload: { url, title, content } }
{ type: 'COURSE_DETECTED', payload: CourseInfo }
{ type: 'SCROLL_PROGRESS', payload: { url, progress } }
{ type: 'TEXT_SELECTED', payload: { text, url } }
{ type: 'QUIZ_REQUESTED', payload: { url } }
{ type: 'NAVIGATE_NEXT', payload: { currentUrl } }
```

### Panel → Background Messages

```typescript
{ type: 'GENERATE_QUIZ', payload: { url, bloomLevels? } }
{ type: 'EVALUATE_ANSWER', payload: { question, answer, pageContent } }
{ type: 'EXPLAIN_TEXT', payload: { text, pageUrl } }
{ type: 'CHAT_MESSAGE', payload: { message, pageUrl, scrollProgress } }
{ type: 'GET_PAGE_PROGRESS', payload: { url } }
{ type: 'GET_COURSE_PROGRESS', payload: { courseId } }
{ type: 'GET_SETTINGS' }
{ type: 'UPDATE_SETTINGS', payload: Partial<Settings> }
{ type: 'SET_API_KEY', payload: { provider, key } }
{ type: 'VALIDATE_PROVIDER', payload: { provider } }
```

## Project Structure

```
coursepilot/
├── entrypoints/
│   ├── background.ts           # AI proxy + message router
│   ├── content/               # Content script (ShadowRoot React UI)
│   │   ├── index.tsx         # defineContentScript + createShadowRootUi
│   │   ├── App.tsx           # FAB, SelectionPopup, scroll tracking
│   │   └── style.css          # Isolated styles (Tailwind v4)
│   └── sidepanel/             # Side panel React app
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx            # Tab router: Quiz | Chat | Progress | Settings
│       └── views/
│           ├── QuizView.tsx   # Quiz generation & answering
│           ├── ChatView.tsx   # Listen mode chat
│           ├── ProgressView.tsx
│           └── SettingsView.tsx
├── lib/
│   ├── ai/
│   │   ├── types.ts           # AIProvider interface
│   │   ├── anthropic-provider.ts
│   │   ├── openai-provider.ts
│   │   ├── gemini-provider.ts
│   │   ├── gateway-provider.ts
│   │   ├── provider-factory.ts
│   │   └── prompts/
│   │       ├── quiz-generation.ts
│   │       └── explanation.ts
│   ├── context/
│   │   ├── page-extractor.ts  # DOM → clean text
│   │   └── llms-txt-loader.ts # Fetch /llms.txt
│   ├── navigation/
│   │   └── course-detector.ts # Docsify, GitBook, generic detection
│   ├── messaging.ts           # Type-safe message protocol
│   └── types.ts               # All shared TypeScript types
├── hooks/
│   └── useAIStream.ts        # Port-based streaming hook
├── utils/
│   ├── storage.ts             # WXT storage definitions
│   └── streaming.ts           # SSE/NDJSON parsing
├── docs/
│   ├── dev/                   # Developer documentation
│   │   ├── architecture.md
│   │   ├── contributing.md
│   │   └── api-reference.md
│   └── user/                   # User documentation
│       ├── getting-started.md
│       └── faq-tips.md
├── wxt.config.ts
└── package.json
```

## Key Patterns

### Creating a New AI Provider

1. Create `lib/ai/new-provider.ts` implementing `AIProvider` interface
2. Add to [`provider-factory.ts`](lib/ai/provider-factory.ts)
3. Update `AIProviderType` in [`lib/types.ts`](lib/types.ts)

### Adding a New Message Type

1. Define in [`lib/messaging.ts`](lib/messaging.ts) union types
2. Handle in [`entrypoints/background.ts`](entrypoints/background.ts) switch statement

### Using Storage

```typescript
import { settingsStorage } from '@/utils/storage';

// Reading
const settings = await settingsStorage.getValue();

// Writing
await settingsStorage.setValue({ theme: 'dark' });

// Watching
settingsStorage.watch((newValue) => { /* ... */ });
```

## Conventions

- **File naming**: kebab-case for files, PascalCase for React components
- **Imports**: Use `@/` path alias for project root
- **Messages**: All typed via `lib/messaging.ts` union types
- **Storage**: Always through `utils/storage.ts` items, never raw `chrome.storage`

## Common Tasks

### Add a New Side Panel View

1. Create `entrypoints/sidepanel/views/MyView.tsx`
2. Import in [`sidepanel/App.tsx`](entrypoints/sidepanel/App.tsx)
3. Add to tab definitions and content area

### Add Storage Key

1. Define in [`utils/storage.ts`](utils/storage.ts) using `storage.defineItem<T>()`
2. Import and use throughout the codebase

### Add Prompt Template

1. Create function in [`lib/ai/prompts/`](lib/ai/prompts/)
2. Use in [`entrypoints/background.ts`](entrypoints/background.ts) message handlers

## Test Subject

The CCLI Monitor Docsify course at `../activity-monitor-for-ai-assitants/course/` is the primary test subject. An `llms.txt` has been created at the course root.

Run with:
```bash
cd ../activity-monitor-for-ai-assitants/course
npx docsify-cli serve . --port 4000
```

## Useful Commands

```bash
npm run dev              # Chrome with hot reload
npm run dev:firefox     # Firefox variant
npm run build           # Production build
npm run check           # TypeScript check
npm run lint            # ESLint
```
