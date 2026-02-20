# CoursePilot Developer Documentation

## Architecture Overview

CoursePilot is built using WXT (Web Extension Framework) with React for UI components. It follows a three-entrypoint architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌─────────────────┐    ┌──────────────┐  │
│  │ Content      │     │ Background      │    │ Side Panel  │  │
│  │ Script       │────▶│ Worker          │◀───│ (React App) │  │
│  │              │     │                 │    │              │  │
│  │ - FAB Button │     │ - AI Proxy      │    │ - Quiz View  │  │
│  │ - Popup      │     │ - Router        │    │ - Chat View  │  │
│  │ - Extraction │     │ - Storage       │    │ - Progress   │  │
│  └──────────────┘     └─────────────────┘    └──────────────┘  │
│         │                      │                     │          │
│         ▼                      ▼                     ▼          │
│  ┌──────────────┐     ┌─────────────────┐    ┌──────────────┐  │
│  │  Host Page   │     │  AI Providers   │    │ Port Stream │  │
│  │  DOM         │     │  (Anthropic,    │    │             │  │
│  │              │     │   OpenAI, etc.) │    │             │  │
│  └──────────────┘     └─────────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Three Entrypoints

### 1. Content Script (`entrypoints/content/`)

Injects UI into the host course page and handles content extraction.

**Key Files:**
- [`index.tsx`](../../entrypoints/content/index.tsx) - WXT content script entry point
- [`App.tsx`](../../entrypoints/content/App.tsx) - React component with FAB, selection popup
- [`style.css`](../../entrypoints/content/style.css) - Tailwind v4 isolated styles

**Responsibilities:**
- Extracts page content after scroll
- Shows FAB button when user scrolls past 70%
- Handles text selection for "Explain this" feature
- Reports scroll progress to background
- Uses Shadow DOM to isolate from host page CSS

**Communication:**
- Sends messages to background via `browser.runtime.sendMessage()`
- Receives messages via `browser.runtime.onMessage`

### 2. Background Worker (`entrypoints/background.ts`)

Central hub for all communication and AI proxy.

**Responsibilities:**
- Message routing between content script and side panel
- AI provider management and proxying
- Storage coordination (all state in browser.storage)
- Port management for streaming connections

**Key Functions:**
```typescript
// Message handling
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Async response
});

// Port-based streaming
browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(handleStreamRequest);
});
```

### 3. Side Panel (`entrypoints/sidepanel/`)

React application with four main views.

**Key Files:**
- [`App.tsx`](../../entrypoints/sidepanel/App.tsx) - Tab router
- [`views/QuizView.tsx`](../../entrypoints/sidepanel/views/QuizView.tsx) - Quiz generation and answering
- [`views/ChatView.tsx`](../../entrypoints/sidepanel/views/ChatView.tsx) - Listen mode chat
- [`views/ProgressView.tsx`](../../entrypoints/sidepanel/views/ProgressView.tsx) - Progress tracking
- [`views/SettingsView.tsx`](../../entrypoints/sidepanel/views/SettingsView.tsx) - Configuration

## Communication Protocol

All communication flows through the background worker. See [`lib/messaging.ts`](../../lib/messaging.ts) for the complete type-safe message protocol.

### Message Types

**Content Script → Background:**
```typescript
{ type: 'PAGE_CONTENT_EXTRACTED', payload: { url, title, content } }
{ type: 'TEXT_SELECTED', payload: { text, url } }
{ type: 'SCROLL_PROGRESS', payload: { url, progress } }
{ type: 'QUIZ_REQUESTED', payload: { url } }
```

**Side Panel → Background:**
```typescript
{ type: 'GENERATE_QUIZ', payload: { url, bloomLevels? } }
{ type: 'EVALUATE_ANSWER', payload: { question, answer, pageContent } }
{ type: 'CHAT_MESSAGE', payload: { message, pageUrl, scrollProgress } }
{ type: 'GET_SETTINGS' }
{ type: 'UPDATE_SETTINGS', payload: Partial<Settings> }
```

**Streaming (Port-based):**
```typescript
{ type: 'STREAM_REQUEST', requestId, messages }
{ type: 'STREAM_CHUNK', requestId, chunk }
{ type: 'STREAM_END', requestId }
{ type: 'STREAM_ERROR', requestId, error }
```

## AI Provider System

### Interface

All providers implement the `AIProvider` interface:

```typescript
interface AIProvider {
  readonly type: AIProviderType;
  stream(options: AIStreamOptions): AsyncGenerator<string, void, unknown>;
  validate(): Promise<boolean>;
}
```

### Providers

| Provider | File | Endpoint |
|---|---|---|
| Anthropic | [`anthropic-provider.ts`](../../lib/ai/anthropic-provider.ts) | `api.anthropic.com/v1/messages` |
| OpenAI | [`openai-provider.ts`](../../lib/ai/openai-provider.ts) | `api.openai.com/v1/chat/completions` |
| Gemini | [`gemini-provider.ts`](../../lib/ai/gemini-provider.ts) | `generativelanguage.googleapis.com/v1beta/...` |
| Gateway | [`gateway-provider.ts`](../../lib/ai/gateway-provider.ts) | Configurable local endpoint |

### Creating a New Provider

1. Create `lib/ai/new-provider.ts`:
```typescript
export class NewProvider implements AIProvider {
  readonly type = 'new' as const;
  
  constructor(private apiKey: string, private model: string) {}
  
  async *stream(options: AIStreamOptions): AsyncGenerator<string> {
    // Implement streaming
  }
  
  async validate(): Promise<boolean> {
    // Test API connection
  }
}
```

2. Add to [`provider-factory.ts`](../../lib/ai/provider-factory.ts):
```typescript
import { NewProvider } from './new-provider';

export function createProvider(options: ProviderOptions): AIProvider {
  switch (options.type) {
    case 'new':
      return new NewProvider(options.apiKey, options.model);
    // ...
  }
}
```

3. Update types in [`lib/types.ts`](../../lib/types.ts):
```typescript
export type AIProviderType = 'anthropic' | 'openai' | 'gemini' | 'gateway' | 'new';
```

## State Management

All state lives in WXT storage (never in-memory) due to the 30-second service worker timeout.

### Storage Keys

| Key | Type | Description |
|---|---|---|
| `sync:settings` | `Settings` | User preferences (synced across devices) |
| `local:apiKeys` | `Record<AIProviderType, string>` | API keys (never synced) |
| `local:courses` | `Record<string, CourseInfo>` | Detected course structures |
| `local:progress` | `Record<string, CourseProgress>` | Mastery per page |
| `local:contextCache` | `Record<string, PageContext>` | Extracted page content |
| `local:chatHistory` | `Record<string, ChatSession>` | Listen mode conversations |
| `local:quizHistory` | `QuizSession[]` | Past quiz sessions |

### Accessing Storage

```typescript
import { settingsStorage, progressStorage } from '@/utils/storage';

// Reading
const settings = await settingsStorage.getValue();

// Writing
await settingsStorage.setValue({ ...settings, theme: 'dark' });

// Watching for changes
settingsStorage.watch((newValue) => {
  console.log('Settings changed:', newValue);
});
```

## Pedagogy Engine

### Bloom's Taxonomy Levels

Questions are generated across six levels:
- **Remember** - Factual recall (MCQ, true/false)
- **Understand** - Explain in your own words
- **Apply** - Use concepts in new situations
- **Analyze** - Compare, contrast, explain why
- **Evaluate** - Judge merit of approaches
- **Create** - Design new solutions

### Mastery Calculation

```typescript
// 80% threshold (configurable)
const masteryThreshold = 80;

// Hint penalty: -15% per hint
const adjustedScore = Math.max(0, score - hintsUsed * 15);

// Page mastered when score >= threshold
const mastered = adjustedScore >= masteryThreshold;
```

### Context Budget

Token budget for AI prompts (100K total):
```
├── System prompts:    ~2K  (fixed)
├── llms.txt seed:     ~20K (if available)
├── Current page:      ~10K (full content)
├── Adjacent pages:    ~10K (prev + next)
├── Visited pages:     ~40K (summarized)
├── Chat history:      ~10K (current session)
└── Reserve:           ~8K  (AI response)
```

## Development Guidelines

### Core Rules

1. **Use npm only** — Not pnpm, not yarn
2. **Read before editing** — Always understand context first
3. **Never install `@types/chrome`** — WXT provides its own types
4. **`return true`** in ALL async message handlers (or use Port)
5. **Shadow DOM** for content script UI — Isolate from host page CSS
6. **Tailwind v4** — Use `@theme` in CSS, NOT `tailwind.config.js`
7. **Background is stateless** — 30s timeout, use storage
8. **Port for streaming** — `browser.runtime.Port` for long-lived connections
9. **No direct content ↔ panel communication** — Always through background

### File Naming Conventions

- **Files**: kebab-case (e.g., `page-extractor.ts`)
- **React Components**: PascalCase (e.g., `QuizView.tsx`)
- **Interfaces/Types**: PascalCase (e.g., `CourseInfo`)

### Imports

Use the `@/` path alias for project root:
```typescript
import { settingsStorage } from '@/utils/storage';
import type { QuizSession } from '@/lib/types';
```

## Testing

### Running Tests

```bash
npm run dev              # Start development server
npm run check            # TypeScript checking
npm run lint             # ESLint
```

### Test Subject

The primary test course is the CCLI Monitor Docsify course at `../activity-monitor-for-ai-assitants/course/`.

```bash
cd ../activity-monitor-for-ai-assitants/course
npx docsify-cli serve . --port 4000
```

## Troubleshooting

### Extension Not Loading
- Make sure you're using Chrome (not Chromium)
- Check that dev mode is enabled in `chrome://extensions`
- Look for errors in the WXT terminal

### API Key Not Working
- Verify the key is correct in Settings
- Check the Test connection button
- Ensure you have credits/ quota on your API account

### Content Not Extracting
- The extension extracts content after 1.5 seconds of page load
- Try scrolling to trigger re-extraction
- Check console for extraction errors

### Service Worker Timeout
- Background is stateless - all state is in storage
- Avoid long-running operations in message handlers
- Use Port for streaming operations
