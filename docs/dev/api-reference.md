# API Reference

This document provides detailed API documentation for CoursePilot.

## Message Protocol

All communication uses typed messages defined in `lib/messaging.ts`.

### Content to Background Messages

```typescript
// Extracted when user scrolls through page content
type PAGE_CONTENT_EXTRACTED = {
  type: 'PAGE_CONTENT_EXTRACTED';
  payload: {
    url: string;
    title: string;
    content: string;
  };
};

// Detected course structure on page
type COURSE_DETECTED = {
  type: 'COURSE_DETECTED';
  payload: CourseInfo;
};

// User scrolled through page
type SCROLL_PROGRESS = {
  type: 'SCROLL_PROGRESS';
  payload: {
    url: string;
    progress: number; // 0-1
  };
};

// User selected text on page
type TEXT_SELECTED = {
  type: 'TEXT_SELECTED';
  payload: {
    text: string;
    url: string;
  };
};

// User clicked quiz FAB
type QUIZ_REQUESTED = {
  type: 'QUIZ_REQUESTED';
  payload: {
    url: string;
  };
};
```

### Panel to Background Messages

```typescript
// Generate quiz for current page
type GENERATE_QUIZ = {
  type: 'GENERATE_QUIZ';
  payload: {
    url: string;
    bloomLevels?: BloomLevel[]; // Optional filter
  };
};

// Evaluate user's answer
type EVALUATE_ANSWER = {
  type: 'EVALUATE_ANSWER';
  payload: {
    question: QuizQuestion;
    answer: string;
    pageContent: string;
  };
};

// Explain selected text
type EXPLAIN_TEXT = {
  type: 'EXPLAIN_TEXT';
  payload: {
    text: string;
    pageUrl: string;
  };
};

// Send chat message in listen mode
type CHAT_MESSAGE = {
  type: 'CHAT_MESSAGE';
  payload: {
    message: string;
    pageUrl: string;
    scrollProgress: number;
  };
};

// Get progress for specific page
type GET_PAGE_PROGRESS = {
  type: 'GET_PAGE_PROGRESS';
  payload: {
    url: string;
  };
};

// Get overall course progress
type GET_COURSE_PROGRESS = {
  type: 'GET_COURSE_PROGRESS';
  payload: {
    courseId: string;
  };
};

// Get current settings
type GET_SETTINGS = {
  type: 'GET_SETTINGS';
};

// Update settings
type UPDATE_SETTINGS = {
  type: 'UPDATE_SETTINGS';
  payload: Partial<Settings>;
};

// Set API key for provider
type SET_API_KEY = {
  type: 'SET_API_KEY';
  payload: {
    provider: AIProviderType;
    key: string;
  };
};

// Validate provider connection
type VALIDATE_PROVIDER = {
  type: 'VALIDATE_PROVIDER';
  payload: {
    provider: AIProviderType;
  };
};
```

## Type Definitions

### AI Types (`lib/types.ts`)

```typescript
// AI Provider Configuration
interface AIProviderConfig {
  type: AIProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// AI Message for LLM
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// AI Stream Options
interface AIStreamOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

// AI Provider Interface
interface AIProvider {
  readonly type: AIProviderType;
  stream(options: AIStreamOptions): AsyncGenerator<string, void, unknown>;
  validate(): Promise<boolean>;
}

// Provider Types
type AIProviderType = 'anthropic' | 'openai' | 'gemini' | 'gateway';
```

### Course Types

```typescript
interface CourseInfo {
  id: string;
  title: string;
  baseUrl: string;
  platform: CoursePlatform;
  pages: CoursePage[];
  llmsTxt?: string;
  detectedAt: number;
}

type CoursePlatform = 'docsify' | 'gitbook' | 'readthedocs' | 'generic';

interface CoursePage {
  url: string;
  title: string;
  path: string;
  order: number;
  parentModule?: string;
}
```

### Quiz Types

```typescript
type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

type QuestionType = 'mcq' | 'true-false' | 'fill-blank' | 'free-response';

interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  bloomLevel: BloomLevel;
  options?: string[];
  correctAnswer?: string;
  hints: string[];
  sourceSection?: string;
}

interface QuizSession {
  id: string;
  courseId: string;
  pageUrl: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  masteryScore: number;
  passed: boolean;
  startedAt: number;
  completedAt?: number;
}
```

### Progress Types

```typescript
interface PageProgress {
  url: string;
  courseId: string;
  masteryScore: number;
  quizSessions: string[];
  scrollProgress: number;
  visitCount: number;
  lastVisited: number;
  mastered: boolean;
}

interface CourseProgress {
  courseId: string;
  pageProgress: Record<string, PageProgress>;
  overallMastery: number;
  pagesCompleted: number;
  totalPages: number;
  startedAt: number;
  lastActiveAt: number;
}
```

### Settings Types

```typescript
interface Settings {
  activeProvider: AIProviderType;
  masteryThreshold: number;
  autoNavigate: boolean;
  questionsPerQuiz: number;
  theme: 'light' | 'dark' | 'system';
  showFAB: boolean;
  showSelectionPopup: boolean;
  keyboardShortcutsEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'anthropic',
  masteryThreshold: 80,
  autoNavigate: false,
  questionsPerQuiz: 5,
  theme: 'system',
  showFAB: true,
  showSelectionPopup: true,
  keyboardShortcutsEnabled: true,
};
```

## Storage API (`utils/storage.ts`)

```typescript
import { settingsStorage, progressStorage, ... } from '@/utils/storage';

// Get value
const settings = await settingsStorage.getValue();

// Set value
await settingsStorage.setValue({ ...settings, theme: 'dark' });

// Watch for changes
settingsStorage.watch((newValue) => {
  console.log('Settings changed:', newValue);
});
```

### Storage Keys

| Storage Key | Type | Description |
|---|---|---|
| `sync:settings` | `Settings` | User preferences |
| `local:apiKeys` | `Record<AIProviderType, string>` | API keys |
| `local:courses` | `Record<string, CourseInfo>` | Courses |
| `local:progress` | `Record<string, CourseProgress>` | Progress |
| `local:contextCache` | `Record<string, PageContext>` | Content |
| `local:chatHistory` | `Record<string, ChatSession>` | Chat |
| `local:quizHistory` | `QuizSession[]` | Quiz history |

## Hooks

### useAIStream (`hooks/useAIStream.ts`)

```typescript
import { useAIStream } from '@/hooks/useAIStream';

function MyComponent() {
  const { streamText, isStreaming, streamedText, abort } = useAIStream();

  const handleSend = async () => {
    const fullText = await streamText(
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ],
      (chunk) => {
        // Called for each chunk of streaming text
        console.log('Received:', chunk);
      }
    );
    console.log('Full response:', fullText);
  };

  return (
    <button onClick={handleSend} disabled={isStreaming}>
      {isStreaming ? 'Loading...' : 'Send'}
    </button>
  );
}
```

## Utility Functions

### Streaming (`utils/streaming.ts`)

```typescript
import { parseSSEStream, estimateTokens } from '@/utils/streaming';

// Parse SSE events from AI providers
for await (const event of parseSSEStream(reader, signal)) {
  if (event.data) {
    console.log('Event:', event);
  }
}

// Estimate token count
const tokens = estimateTokens('Hello world'); // ~3 tokens
```

### Course Detection (`lib/navigation/course-detector.ts`)

```typescript
import { detectCourse } from '@/lib/navigation/course-detector';

const course = detectCourse(document);
if (course) {
  console.log('Found course:', course.title);
  console.log('Platform:', course.platform);
  console.log('Pages:', course.pages.length);
}
```

### Page Extraction (`lib/context/page-extractor.ts`)

```typescript
import { extractPageContent } from '@/lib/context/page-extractor';

const { content, title, platform } = extractPageContent(document);
console.log('Title:', title);
console.log('Platform:', platform);
console.log('Content length:', content.length);
```

## Constants

### Default Models (`lib/ai/types.ts`)

```typescript
const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  gemini: 'gemini-3-flash-preview',
  gateway: 'default',
};
```

### Context Budget (`lib/types.ts`)

```typescript
const DEFAULT_CONTEXT_BUDGET = {
  systemPrompt: 2000,
  llmsTxt: 20000,
  currentPage: 10000,
  adjacentPages: 10000,
  visitedPages: 40000,
  chatHistory: 10000,
  reserve: 8000,
  total: 100000,
};
```
