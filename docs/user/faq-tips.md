# FAQ & Tips

## Frequently Asked Questions

### General

**Q: What is CoursePilot?**
A: CoursePilot is a Chrome extension that uses AI to help you learn more effectively from online courses. It generates quizzes, provides explanations, and tracks your progress.

**Q: Does CoursePilot work with all websites?**
A: CoursePilot works best with structured course platforms like Docsify, GitBook, and ReadTheDocs. It can also extract content from most websites with substantial text content.

**Q: Is my data safe?**
A: Yes. All your data stays on your device. API keys are stored locally and never synced. Content extraction happens only in your browser.

### AI Providers

**Q: Which AI provider should I choose?**
A: All providers work well, but:
- **Anthropic (Claude)** - Best for educational explanations
- **OpenAI (GPT)** - Fast and versatile
- **Google (Gemini)** - Good free tier available
- **Local Gateway** - Free if you run a local AI model

**Q: How much do AI providers cost?**
A: Costs vary by provider and usage. All have free tiers:
- Anthropic: Free tier available
- OpenAI: Pay-per-use (very low cost for text)
- Google: Generous free tier
- Local: Free (runs on your machine)

**Q: Why isn't my API key working?**
A: Check these common issues:
1. Key is entered correctly in Settings
2. You have internet connection
3. Your account has credits/quota
4. Try clicking "Test" to diagnose

### Quiz & Learning

**Q: How does quiz generation work?**
A: The extension extracts content from the page and sends it to the AI. The AI generates questions based on Bloom's Taxonomy to test different levels of understanding.

**Q: What are Bloom's Taxonomy levels?**
A: It's a framework for educational objectives:
- Remember - Recall facts
- Understand - Explain concepts
- Apply - Use knowledge
- Analyze - Examine relationships
- Evaluate - Judge approaches
- Create - Design solutions

**Q: Why should I use hints?**
A: Hints help when you're stuck, but each hint reduces your score by 15%. Use them wisely!

**Q: What's the mastery threshold?**
A: Default is 80%. Score at or above this to "master" a page. You can adjust this in Settings.

**Q: Can I retake quizzes?**
A: Yes! Each time you generate a quiz, you get new questions. Your previous scores are saved in quiz history.

### Listen Mode

**Q: What is Listen Mode?**
A: It's a chat feature where you can ask questions about what you've read. The AI only sees content you've scrolled past - no spoilers!

**Q: How does the "no spoilers" feature work?**
A: CoursePilot tracks your scroll position. When you send a message, it only includes content from pages/sections you've already read.

**Q: Can I get explanations for specific text?**
A: Yes! Select any text on the page and click "Explain this" in the popup.

### Progress Tracking

**Q: How is progress tracked?**
A: Progress is tracked per-page based on:
- Quiz scores (mastery)
- Scroll progress (reading)
- Visit frequency

**Q: Can I see my progress across courses?**
A: Yes! The Progress tab shows:
- Overall mastery score
- Pages mastered vs. total
- Per-page breakdown

**Q: Does progress sync across devices?**
A: Settings sync across devices. Progress is currently device-specific.

### Troubleshooting

**Q: The FAB button isn't appearing**
A: Try:
1. Scroll past 70% of the page
2. Refresh the page
3. Check Settings - FAB might be disabled

**Q: Content extraction isn't working**
A: Ensure:
1. Page has loaded completely (wait 2 seconds)
2. You're on a supported platform
3. No other extensions blocking content scripts

**Q: The side panel won't open**
A: Try:
1. Click the extension icon in toolbar
2. Use keyboard shortcut `Alt+Shift+C`
3. Refresh the page

**Q: AI responses are slow**
A: This depends on your API provider. Try:
1. Using a faster provider (GPT-4o is quick)
2. Checking your internet connection
3. Reducing quiz question count

---

## Tips & Tricks

### Getting the Most from Quizzes

1. **Read first, quiz later** - Complete at least one full read-through before taking a quiz

2. **Use all question types** - Mix of MCQ and free-response questions gives better learning

3. **Don't fear hints** - It's better to use a hint and learn than to guess wrong

4. **Review feedback** - The AI provides detailed feedback - read it carefully

5. **Retake strategically** - Take a quiz, note weak areas, re-read, then retake

### Effective Explanations

1. **Be specific** - Select the exact text you don't understand

2. **Ask follow-ups** - The chat context carries over, so ask clarifying questions

3. **Use for examples** - Ask for real-world examples of abstract concepts

### Mastery Tips

1. **Space your learning** - Don't try to master everything in one session

2. **Focus on weak areas** - Your progress page shows where to focus

3. **Set achievable goals** - Adjust the mastery threshold if 80% is too challenging

### Listen Mode Best Practices

1. **Ask "why" questions** - "Why does this approach work?"

2. **Request comparisons** - "How does this differ from X?"

3. **Test your understanding** - "Can you give me an example of..."

4. **No premature spoilers** - Trust the scroll-based context system

### Productivity Hints

1. **Keyboard shortcut** - Use `Alt+Shift+C` to quickly open the panel

2. **Multiple tabs** - You can have CoursePilot active on multiple course tabs

3. **PIN it** - Pin the extension for quick access

4. **Theme setting** - Match your Chrome theme for seamless look

---

## Advanced Usage

### Customizing Quiz Generation

You can influence quiz generation by:
- Specifying which Bloom's levels to focus on
- Adjusting number of questions
- Setting mastery threshold

### Using Local AI

For free, unlimited AI:
1. Install [Ollama](https://ollama.ai/) or [LM Studio](https://lmstudio.ai/)
2. Start a model (e.g., `ollama run llama2`)
3. Set provider to "Local Gateway"
4. Use default port 18789 (or your configured port)

### Integration with Course Platforms

CoursePilot automatically detects:
- Course navigation/sidebar
- Content sections
- Previous/next page links

This enables features like:
- Auto-navigation after mastery
- Cross-page progress tracking
- Adjacent page context for AI

---

Still have questions? Open an issue on GitHub!
