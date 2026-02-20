# CoursePilot User Guide

Welcome to CoursePilot! This guide will help you get started with the extension and make the most of its features.

## What is CoursePilot?

CoursePilot is an AI-powered Chrome extension that transforms online courses into interactive learning experiences. It helps you:

- 📝 **Generate quizzes** from course content to test your understanding
- 💡 **Get instant explanations** for any concept you select
- 📊 **Track your progress** across all course pages
- 💬 **Chat with AI** about what you've read (no spoilers!)

## Installation

### From Chrome Web Store

1. Open the [CoursePilot page](https://chrome.google.com/webstore) in Chrome
2. Click **Add to Chrome**
3. Click **Add Extension** in the confirmation dialog

### From Source (Development)

If you're installing from source:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd coursepilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development:
   ```bash
   npm run dev
   ```

4. The extension will be automatically loaded in Chrome

## First-Time Setup

After installing, follow these steps to get started:

### Step 1: Pin the Extension

1. In Chrome, click the puzzle piece icon (🧩) in the toolbar
2. Find CoursePilot and click the pin icon to pin it

### Step 2: Configure Your AI Provider

1. Click the CoursePilot icon in the toolbar (or press `Alt+Shift+C`)
2. The side panel opens
3. Click the **Settings** tab (⚙️)
4. Select your preferred AI provider:
   - **Anthropic (Claude)** - Best for educational content
   - **OpenAI (GPT)** - Fast and capable
   - **Google (Gemini)** - Good free tier
   - **Local Gateway** - For Ollama, LM Studio, etc.
5. Enter your API key
6. Click **Test** to verify the connection

> **Note:** You'll need an API key from your chosen provider. Click the provider name to visit their website and get an API key.

### Step 3: Start Learning!

You're ready to go! Navigate to any online course and start learning.

## Core Features

### Taking a Quiz

1. **Navigate** to a course page
2. **Read** through the content (the extension extracts text as you scroll)
3. **Wait** for the "Ready for quiz?" button to appear (after scrolling 70%)
4. **Click** the button to open the side panel
5. **Answer** the generated questions
6. **Review** your score and feedback

#### Quiz Tips

- Each question has progressive hints (up to 3)
- Using hints costs -15% from your score
- Score 80% or higher to master a page
- You can retake quizzes anytime

### Getting Explanations

1. **Select** any text on the course page
2. A popup appears with "💡 Explain this"
3. **Click** to open the Chat tab with an explanation
4. You can also ask follow-up questions

### Listen Mode (Chat)

Chat with AI about what you've read - without spoilers!

1. Open the **Chat** tab in the side panel
2. Ask questions about the content
3. The AI only sees content you've scrolled past

> **How it works:** CoursePilot tracks your scroll position and only provides context from what you've read. This means you can ask about something you don't fully understand without getting spoilers about upcoming content!

### Tracking Progress

1. Open the **Progress** tab in the side panel
2. View your overall mastery score
3. See which pages you've mastered
4. Track your learning journey

## Supported Course Platforms

CoursePilot works with most online course platforms:

- 📚 **Docsify** - Documentation sites
- 📖 **GitBook** - Modern documentation
- 📑 **ReadTheDocs** - Python documentation
- 🌐 **Generic** - Most other course platforms

The extension automatically detects the course platform and extracts content accordingly.

## Settings Reference

### AI Provider Settings

| Setting | Description |
|---------|-------------|
| Provider | Choose between Anthropic, OpenAI, Google, or Local Gateway |
| API Key | Your authentication key for the provider |
| Test | Verify your connection works |

### Quiz Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Mastery Threshold | Score needed to master a page | 80% |
| Questions per Quiz | Number of questions generated | 5 |
| Auto-navigate | Move to next page after mastery | Off |

### Interface Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Show FAB button | Display quiz button on scroll | On |
| Show selection popup | Show "Explain this" on text select | On |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+C` | Open CoursePilot side panel |

## Troubleshooting

### Extension Not Appearing

1. Click the puzzle piece (🧩) in Chrome's toolbar
2. Find CoursePilot and click the pin icon

### Quiz Generation Fails

1. Check your API key in Settings
2. Ensure you have internet connection
3. Verify you have credits/quota on your API account

### Content Not Extracting

1. Try scrolling through the page again
2. Ensure you're on a supported platform
3. Check for popup blockers interfering

### No Progress Tracking

Progress is tracked per-course. Make sure you're visiting pages within a detected course structure.

## Privacy

- **API Keys:** Stored locally on your device, never synced
- **Content:** Extracted content stays on your device
- **Chat History:** Stored locally, used only for context

## Getting Help

- Report issues on GitHub
- Check the documentation
- Review the extension settings

---

Happy learning! 🎓
