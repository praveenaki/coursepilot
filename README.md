# CoursePilot

AI-powered course companion Chrome extension. Turns any online text-based course into an interactive, AI-tutored learning experience with quizzes, concept explanations, and mastery tracking.

## Quick Start

```bash
# Prerequisites: Node.js 20+
npm install
npm run dev
```

This builds the extension and opens a Chrome instance with it loaded. The side panel, content scripts, and background worker are all hot-reloaded on save.

### WXT Dev Mode Quirks

- **WXT owns the Chrome instance.** It launches a dedicated Chrome profile with the extension pre-loaded. Closing that Chrome window kills the dev server.
- **Port 3000 by default.** WXT's internal dev server uses port 3000. If you're also running a local course server, start the course on a different port.
- **Reopen browser:** Press `o` + `Enter` in the WXT terminal to reopen Chrome if you accidentally close it.
- **Service worker timeout:** The background script is a Manifest V3 service worker with a 30-second idle timeout. All state lives in `browser.storage`, never in memory.

## AI Providers

| Provider | Model | Auth |
|---|---|---|
| Anthropic | Claude Sonnet 4.5 | API key header |
| OpenAI | GPT-4o | Bearer token |
| Google | Gemini 3 Flash Preview | API key param |
| Local Gateway | Configurable | Bearer token |

Configure in the extension's Settings tab (side panel).

## Development

```bash
npm run dev              # Chrome with hot reload
npm run dev:firefox      # Firefox variant
npm run build            # Production build
npm run check            # TypeScript check
```

## Test Subject

The primary test course is the CCLI Monitor Docsify course at `../activity-monitor-for-ai-assitants/course/`. Start it with:

```bash
cd ../activity-monitor-for-ai-assitants/course
npx docsify-cli serve . --port 4000
```

Then navigate to `http://localhost:4000` in the WXT Chrome window.
