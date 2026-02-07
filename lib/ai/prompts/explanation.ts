export function buildExplanationPrompt(
  selectedText: string,
  pageContent: string,
  pageTitle: string,
): string {
  return `You are a patient, expert tutor helping a student understand course material.

## Course Page
Title: ${pageTitle}

## Full Page Context
${pageContent}

## Selected Text to Explain
"${selectedText}"

## Instructions
Explain the selected text clearly and concisely:
1. **What it means** — Plain language explanation
2. **Why it matters** — Context within the broader topic
3. **How it connects** — Link to other concepts on this page

Keep the explanation focused and accessible. Use analogies if helpful. Don't overwhelm with unnecessary detail.`;
}

export function buildListenModePrompt(
  question: string,
  contentSoFar: string,
  pageTitle: string,
  chatHistory: Array<{ role: string; content: string }>,
): string {
  const historyContext = chatHistory.length > 0
    ? `\n## Previous Q&A\n${chatHistory.map((m) => `**${m.role}**: ${m.content}`).join('\n\n')}\n`
    : '';

  return `You are a tutor walking through course material with a student. The student is reading at their own pace and has paused to ask a question.

## Course Page
Title: ${pageTitle}

## Content Covered So Far
(The student has read up to this point)
${contentSoFar}
${historyContext}
## Student's Question
${question}

## Instructions
Answer based ONLY on the content the student has covered so far. Don't reference material they haven't reached yet — that would spoil the learning progression.

If the question relates to content they haven't reached, say something like: "Great question! Keep reading — that's coming up soon."

Be conversational and encouraging, like a knowledgeable friend explaining things.`;
}
