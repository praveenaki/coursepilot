import { useState, useCallback } from 'react';
import { useAIStream } from '@/hooks/useAIStream';
import { sendToBackground } from '@/lib/messaging';
import type { QuizQuestion } from '@/lib/types';

type QuizState = 'idle' | 'generating' | 'answering' | 'feedback' | 'complete';

export default function QuizView() {
  const [state, setState] = useState<QuizState>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const { streamText, isStreaming, streamedText } = useAIStream();

  const currentQuestion = questions[currentIndex];

  const handleGenerateQuiz = useCallback(async () => {
    setState('generating');

    try {
      // Get active tab URL
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        setState('idle');
        return;
      }

      const result = await sendToBackground({
        type: 'GENERATE_QUIZ',
        payload: { url: tab.url },
      }) as { ok?: boolean; prompt?: string; error?: string };

      if (result.error) {
        setFeedback(result.error);
        setState('idle');
        return;
      }

      if (result.prompt) {
        let fullResponse = '';
        await streamText(
          [
            { role: 'system', content: 'You are a quiz generator. Return only valid JSON.' },
            { role: 'user', content: result.prompt },
          ],
          (chunk) => {
            fullResponse += chunk;
          },
        );

        // Parse the generated quiz
        try {
          // Extract JSON array from response (handle markdown code blocks)
          const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as QuizQuestion[];
            const withIds = parsed.map((q, i) => ({
              ...q,
              id: `q-${Date.now()}-${i}`,
            }));
            setQuestions(withIds);
            setCurrentIndex(0);
            setTotalScore(0);
            setState('answering');
          }
        } catch {
          setFeedback('Failed to parse quiz. Please try again.');
          setState('idle');
        }
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Quiz generation failed');
      setState('idle');
    }
  }, [streamText]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || !userAnswer.trim()) return;
    setState('feedback');

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      const result = await sendToBackground({
        type: 'EVALUATE_ANSWER',
        payload: {
          question: currentQuestion,
          answer: userAnswer,
          pageContent: '', // Background will fetch from cache
        },
      }) as { ok?: boolean; prompt?: string };

      if (result.prompt) {
        let fullResponse = '';
        await streamText(
          [
            { role: 'system', content: 'You are an answer evaluator. Return only valid JSON.' },
            { role: 'user', content: result.prompt },
          ],
          (chunk) => {
            fullResponse += chunk;
          },
        );

        try {
          const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const evaluation = JSON.parse(jsonMatch[0]);
            // Apply hint penalty: each hint = -15%
            const adjustedScore = Math.max(0, evaluation.score - hintsUsed * 15);
            setScore(adjustedScore);
            setTotalScore((prev) => prev + adjustedScore);
            setFeedback(evaluation.feedback);
          }
        } catch {
          setFeedback('Could not evaluate answer. Moving to next question.');
          setScore(0);
        }
      }
    } catch (error) {
      setFeedback('Evaluation failed. Please try again.');
    }
  }, [currentQuestion, userAnswer, hintsUsed, streamText]);

  const handleNextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setUserAnswer('');
      setHintsUsed(0);
      setFeedback('');
      setScore(0);
      setState('answering');
    } else {
      setState('complete');
    }
  }, [currentIndex, questions.length]);

  const handleShowHint = useCallback(() => {
    if (!currentQuestion || hintsUsed >= currentQuestion.hints.length) return;
    setHintsUsed((h) => h + 1);
  }, [currentQuestion, hintsUsed]);

  // ── Render ────────────────────────────────────────────

  if (state === 'idle') {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h2 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
          Ready to test your knowledge?
        </h2>
        <p style={{ color: 'var(--color-cp-text-muted)', marginBottom: '24px', fontSize: '13px' }}>
          Navigate to a course page and generate a quiz based on what you've read.
        </p>
        <button onClick={handleGenerateQuiz} style={buttonStyle}>
          Generate Quiz
        </button>
        {feedback && (
          <p style={{ color: 'var(--color-cp-warning)', marginTop: '12px', fontSize: '13px' }}>
            {feedback}
          </p>
        )}
      </div>
    );
  }

  if (state === 'generating') {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⏳</div>
        <p style={{ color: 'var(--color-cp-text-muted)' }}>
          {isStreaming ? 'Generating quiz...' : 'Preparing...'}
        </p>
        {streamedText && (
          <p style={{ fontSize: '11px', color: 'var(--color-cp-text-dim)', marginTop: '8px' }}>
            {streamedText.length} characters received...
          </p>
        )}
      </div>
    );
  }

  if (state === 'complete') {
    const avgScore = questions.length > 0 ? Math.round(totalScore / questions.length) : 0;
    const passed = avgScore >= 80;

    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {passed ? '🎉' : '📚'}
        </div>
        <h2 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
          {passed ? 'Mastery Achieved!' : 'Keep Learning'}
        </h2>
        <div style={{
          fontSize: '36px',
          fontWeight: 700,
          color: passed ? 'var(--color-cp-success)' : 'var(--color-cp-warning)',
          marginBottom: '8px',
        }}>
          {avgScore}%
        </div>
        <p style={{ color: 'var(--color-cp-text-muted)', marginBottom: '24px', fontSize: '13px' }}>
          {passed
            ? 'Great work! You\'ve demonstrated understanding of this material.'
            : 'Review the material and try again. Focus on the areas where you received feedback.'}
        </p>
        <button onClick={handleGenerateQuiz} style={buttonStyle}>
          {passed ? 'Take Another Quiz' : 'Retry Quiz'}
        </button>
      </div>
    );
  }

  // state === 'answering' || 'feedback'
  return (
    <div style={{ padding: '16px' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)' }}>
          {currentIndex + 1}/{questions.length}
        </span>
        <div style={{
          flex: 1, height: '4px', borderRadius: '2px',
          background: 'var(--color-cp-border)',
        }}>
          <div style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
            height: '100%', borderRadius: '2px',
            background: 'var(--color-cp-primary)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
          background: 'var(--color-cp-surface)',
          color: 'var(--color-cp-text-muted)',
          textTransform: 'capitalize',
        }}>
          {currentQuestion?.bloomLevel}
        </span>
      </div>

      {/* Question */}
      <div style={{
        padding: '16px', borderRadius: '8px',
        background: 'var(--color-cp-surface)',
        marginBottom: '12px',
      }}>
        <p style={{ fontWeight: 500, lineHeight: 1.6 }}>{currentQuestion?.text}</p>
      </div>

      {/* MCQ Options */}
      {currentQuestion?.type === 'mcq' && currentQuestion.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {currentQuestion.options.map((option, i) => (
            <button
              key={i}
              onClick={() => setUserAnswer(option)}
              disabled={state === 'feedback'}
              style={{
                padding: '10px 14px',
                background: userAnswer === option ? 'var(--color-cp-primary)' : 'var(--color-cp-surface)',
                color: userAnswer === option ? 'white' : 'var(--color-cp-text)',
                border: `1px solid ${userAnswer === option ? 'var(--color-cp-primary)' : 'var(--color-cp-border)'}`,
                borderRadius: '8px',
                cursor: state === 'feedback' ? 'default' : 'pointer',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Free Response */}
      {(currentQuestion?.type === 'free-response' || currentQuestion?.type === 'fill-blank') && (
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          disabled={state === 'feedback'}
          placeholder={
            currentQuestion.type === 'fill-blank'
              ? 'Fill in the blank...'
              : 'Type your answer...'
          }
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            background: 'var(--color-cp-surface)',
            color: 'var(--color-cp-text)',
            border: '1px solid var(--color-cp-border)',
            borderRadius: '8px',
            resize: 'vertical',
            fontSize: '13px',
            fontFamily: 'inherit',
            marginBottom: '12px',
          }}
        />
      )}

      {/* True/False */}
      {currentQuestion?.type === 'true-false' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {['True', 'False'].map((option) => (
            <button
              key={option}
              onClick={() => setUserAnswer(option)}
              disabled={state === 'feedback'}
              style={{
                flex: 1,
                padding: '10px',
                background: userAnswer === option ? 'var(--color-cp-primary)' : 'var(--color-cp-surface)',
                color: userAnswer === option ? 'white' : 'var(--color-cp-text)',
                border: `1px solid ${userAnswer === option ? 'var(--color-cp-primary)' : 'var(--color-cp-border)'}`,
                borderRadius: '8px',
                cursor: state === 'feedback' ? 'default' : 'pointer',
                fontWeight: 500,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Hints */}
      {state === 'answering' && currentQuestion?.hints && hintsUsed < currentQuestion.hints.length && (
        <button
          onClick={handleShowHint}
          style={{
            background: 'transparent',
            color: 'var(--color-cp-warning)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            marginBottom: '8px',
          }}
        >
          💡 Show hint ({hintsUsed}/{currentQuestion.hints.length}) · -15% per hint
        </button>
      )}

      {/* Displayed Hints */}
      {hintsUsed > 0 && currentQuestion?.hints && (
        <div style={{ marginBottom: '12px' }}>
          {currentQuestion.hints.slice(0, hintsUsed).map((hint, i) => (
            <div
              key={i}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderLeft: '3px solid var(--color-cp-warning)',
                borderRadius: '0 6px 6px 0',
                fontSize: '12px',
                color: 'var(--color-cp-text-muted)',
              }}
            >
              💡 {hint}
            </div>
          ))}
        </div>
      )}

      {/* Feedback */}
      {state === 'feedback' && feedback && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
          background: score >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderLeft: `3px solid ${score >= 70 ? 'var(--color-cp-success)' : 'var(--color-cp-danger)'}`,
          fontSize: '13px',
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {score >= 70 ? '✓' : '✗'} Score: {score}%
          </div>
          {feedback}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {state === 'answering' && (
          <button
            onClick={handleSubmitAnswer}
            disabled={!userAnswer.trim() || isStreaming}
            style={{
              ...buttonStyle,
              flex: 1,
              opacity: !userAnswer.trim() ? 0.5 : 1,
            }}
          >
            {isStreaming ? 'Evaluating...' : 'Submit Answer'}
          </button>
        )}
        {state === 'feedback' && (
          <button onClick={handleNextQuestion} style={{ ...buttonStyle, flex: 1 }}>
            {currentIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
          </button>
        )}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'var(--color-cp-primary)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px',
};
