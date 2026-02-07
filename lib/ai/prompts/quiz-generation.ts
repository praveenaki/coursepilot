import type { BloomLevel } from '@/lib/types';

export function buildQuizGenerationPrompt(
  pageContent: string,
  pageTitle: string,
  questionCount: number,
  bloomLevels?: BloomLevel[],
): string {
  const levels = bloomLevels?.length
    ? bloomLevels
    : ['remember', 'understand', 'apply', 'analyze', 'evaluate'];

  return `You are an expert educator creating quiz questions for mastery-based learning.

## Page Content
Title: ${pageTitle}

${pageContent}

## Instructions
Generate exactly ${questionCount} questions testing the student's understanding of this content.

### Question Distribution
Distribute questions across these Bloom's Taxonomy levels: ${levels.join(', ')}

### Question Type Guidelines
- **remember**: MCQ or true/false — test factual recall
- **understand**: Free response — "Explain in your own words..."
- **apply**: MCQ or free response — "Given this scenario..."
- **analyze**: Free response — "Compare..." or "Why does..."
- **evaluate**: Free response — "Is this a good approach? Why?"
- **create**: Free response — "Design..." or "How would you..."

### Progressive Hints (3 levels per question)
1. Gentle nudge — points to the right section
2. More specific — narrows the concept
3. Nearly reveals — almost gives the answer

### Output Format
Respond with a JSON array. Each question object:
\`\`\`json
{
  "text": "The question text",
  "type": "mcq" | "true-false" | "fill-blank" | "free-response",
  "bloomLevel": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
  "options": ["A", "B", "C", "D"],  // Only for MCQ
  "correctAnswer": "The correct answer",  // For MCQ/true-false/fill-blank
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "sourceSection": "Which section of the page this question tests"
}
\`\`\`

Return ONLY the JSON array, no other text.`;
}

export function buildAnswerEvaluationPrompt(
  question: string,
  questionType: string,
  correctAnswer: string | undefined,
  userAnswer: string,
  pageContent: string,
): string {
  return `You are an expert educator evaluating a student's answer.

## Question
${question}

## Question Type
${questionType}

${correctAnswer ? `## Expected Answer\n${correctAnswer}\n` : ''}
## Student's Answer
${userAnswer}

## Source Material
${pageContent}

## Instructions
Evaluate the student's answer for:
1. **Accuracy** — Is it factually correct based on the source material?
2. **Completeness** — Does it cover the key concepts?
3. **Understanding** — Does the student demonstrate genuine comprehension?

## Output Format
Respond with JSON:
\`\`\`json
{
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "Specific, encouraging feedback explaining what was right/wrong and why"
}
\`\`\`

For free-response questions, be generous — award partial credit for demonstrating understanding even if the answer isn't perfect. A score of 70+ means the student understands the concept.

Return ONLY the JSON object, no other text.`;
}
