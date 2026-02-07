import { createProvider } from '@/lib/ai/provider-factory';
import { PORT_NAMES } from '@/lib/messaging';
import type {
  ContentToBackgroundMessage,
  IncomingMessage,
  PanelToBackgroundMessage,
  StreamPortMessage,
} from '@/lib/messaging';
import type { AIProvider, AIProviderType } from '@/lib/types';
import {
  apiKeysStorage,
  contextCacheStorage,
  coursesStorage,
  gatewayUrlStorage,
  pendingExplanationStorage,
  progressStorage,
  settingsStorage,
} from '@/utils/storage';
import { DEFAULT_MODELS } from '@/lib/ai/types';
import { buildQuizGenerationPrompt, buildAnswerEvaluationPrompt } from '@/lib/ai/prompts/quiz-generation';
import { buildExplanationPrompt, buildListenModePrompt } from '@/lib/ai/prompts/explanation';

export default defineBackground(() => {
  console.log('[CoursePilot] Background worker started');

  // ─── AI Provider Management ───────────────────────────

  async function getProvider(): Promise<AIProvider> {
    const settings = await settingsStorage.getValue();
    const keys = await apiKeysStorage.getValue();
    const gatewayUrl = await gatewayUrlStorage.getValue();

    return createProvider({
      type: settings.activeProvider,
      apiKey: keys[settings.activeProvider],
      baseUrl: settings.activeProvider === 'gateway' ? gatewayUrl : undefined,
    });
  }

  // ─── Streaming via Port ───────────────────────────────

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAMES.AI_STREAM) return;

    port.onMessage.addListener(async (msg: { type: string; requestId: string; messages: Array<{ role: string; content: string }> }) => {
      if (msg.type !== 'STREAM_REQUEST') return;

      const { requestId, messages } = msg;

      try {
        const provider = await getProvider();
        const portMsg: StreamPortMessage = { type: 'STREAM_START', requestId };
        port.postMessage(portMsg);

        for await (const chunk of provider.stream({ messages })) {
          const chunkMsg: StreamPortMessage = { type: 'STREAM_CHUNK', requestId, chunk };
          port.postMessage(chunkMsg);
        }

        const endMsg: StreamPortMessage = { type: 'STREAM_END', requestId };
        port.postMessage(endMsg);
      } catch (error) {
        const errorMsg: StreamPortMessage = {
          type: 'STREAM_ERROR',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        port.postMessage(errorMsg);
      }
    });
  });

  // ─── Message Router ───────────────────────────────────

  browser.runtime.onMessage.addListener(
    (message: IncomingMessage, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((error) => {
          console.error('[CoursePilot] Message handler error:', error);
          sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
        });
      return true; // Async response
    },
  );

  async function handleMessage(message: IncomingMessage): Promise<unknown> {
    switch (message.type) {
      // ── Content Script Messages ──────────────────────

      case 'PAGE_CONTENT_EXTRACTED': {
        const { url, title, content } = message.payload;
        const cache = await contextCacheStorage.getValue();
        cache[url] = {
          url,
          title,
          content,
          extractedAt: Date.now(),
          tokenEstimate: Math.ceil(content.length / 4),
        };
        await contextCacheStorage.setValue(cache);
        return { ok: true };
      }

      case 'COURSE_DETECTED': {
        const course = message.payload;
        const courses = await coursesStorage.getValue();
        courses[course.id] = course;
        await coursesStorage.setValue(courses);
        return { ok: true };
      }

      case 'SCROLL_PROGRESS': {
        const { url, progress } = message.payload;
        const allProgress = await progressStorage.getValue();
        // Find the course this URL belongs to
        for (const courseProgress of Object.values(allProgress)) {
          if (courseProgress.pageProgress[url]) {
            courseProgress.pageProgress[url].scrollProgress = progress;
            courseProgress.pageProgress[url].lastVisited = Date.now();
          }
        }
        await progressStorage.setValue(allProgress);
        return { ok: true };
      }

      case 'QUIZ_REQUESTED': {
        // Open side panel for the requesting tab
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await browser.sidePanel.open({ tabId: tab.id });
        }
        return { ok: true };
      }

      case 'TEXT_SELECTED': {
        const { text, url } = message.payload;
        // Store the selected text so the side panel can pick it up
        await pendingExplanationStorage.setValue({
          text,
          pageUrl: url,
          timestamp: Date.now(),
        });
        // Open side panel for the requesting tab
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          await browser.sidePanel.open({ tabId: activeTab.id });
        }
        return { ok: true };
      }

      case 'NAVIGATE_NEXT':
        return { ok: true };

      // ── Side Panel Messages ──────────────────────────

      case 'GENERATE_QUIZ': {
        const { url, bloomLevels } = message.payload;
        const cache = await contextCacheStorage.getValue();
        const pageContext = cache[url];
        if (!pageContext) {
          return { error: 'Page content not yet extracted. Please scroll through the page first.' };
        }
        const settings = await settingsStorage.getValue();
        const prompt = buildQuizGenerationPrompt(
          pageContext.content,
          pageContext.title,
          settings.questionsPerQuiz,
          bloomLevels,
        );
        // Return prompt for streaming via Port
        return { ok: true, prompt, pageTitle: pageContext.title };
      }

      case 'EVALUATE_ANSWER': {
        const { question, answer, pageContent } = message.payload;
        const prompt = buildAnswerEvaluationPrompt(
          question.text,
          question.type,
          question.correctAnswer,
          answer,
          pageContent,
        );
        return { ok: true, prompt };
      }

      case 'EXPLAIN_TEXT': {
        const { text, pageUrl } = message.payload;
        const cache = await contextCacheStorage.getValue();
        const pageContext = cache[pageUrl];
        const prompt = buildExplanationPrompt(
          text,
          pageContext?.content ?? '',
          pageContext?.title ?? 'Unknown Page',
        );
        return { ok: true, prompt };
      }

      case 'CHAT_MESSAGE': {
        const { message: userMsg, pageUrl, scrollProgress } = message.payload;
        const cache = await contextCacheStorage.getValue();
        const pageContext = cache[pageUrl];
        if (!pageContext) {
          return { error: 'Page content not extracted yet.' };
        }
        // Slice content to what user has scrolled through
        const contentLength = pageContext.content.length;
        const visibleContent = pageContext.content.slice(
          0,
          Math.ceil(contentLength * Math.max(scrollProgress, 0.1)),
        );
        const prompt = buildListenModePrompt(
          userMsg,
          visibleContent,
          pageContext.title,
          [],
        );
        return { ok: true, prompt };
      }

      case 'GET_PAGE_PROGRESS': {
        const { url } = message.payload;
        const allProgress = await progressStorage.getValue();
        for (const courseProgress of Object.values(allProgress)) {
          if (courseProgress.pageProgress[url]) {
            return courseProgress.pageProgress[url];
          }
        }
        return null;
      }

      case 'GET_COURSE_PROGRESS': {
        const { courseId } = message.payload;
        const allProgress = await progressStorage.getValue();
        return allProgress[courseId] ?? null;
      }

      case 'GET_SETTINGS':
        return await settingsStorage.getValue();

      case 'UPDATE_SETTINGS': {
        const current = await settingsStorage.getValue();
        const updated = { ...current, ...message.payload };
        await settingsStorage.setValue(updated);
        return updated;
      }

      case 'SET_API_KEY': {
        const { provider, key } = message.payload;
        const keys = await apiKeysStorage.getValue();
        keys[provider] = key;
        await apiKeysStorage.setValue(keys);
        return { ok: true };
      }

      case 'VALIDATE_PROVIDER': {
        const { provider: providerType } = message.payload;
        try {
          const keys = await apiKeysStorage.getValue();
          const gatewayUrl = await gatewayUrlStorage.getValue();
          const p = createProvider({
            type: providerType,
            apiKey: keys[providerType],
            baseUrl: providerType === 'gateway' ? gatewayUrl : undefined,
          });
          const valid = await p.validate();
          return { provider: providerType, valid };
        } catch (error) {
          return {
            provider: providerType,
            valid: false,
            error: error instanceof Error ? error.message : 'Validation failed',
          };
        }
      }

      default:
        console.warn('[CoursePilot] Unknown message type:', (message as { type: string }).type);
        return { error: 'Unknown message type' };
    }
  }

  // ─── Action Click → Open Side Panel ───────────────────

  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });
});
