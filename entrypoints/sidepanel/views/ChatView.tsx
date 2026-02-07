import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIStream } from '@/hooks/useAIStream';
import { sendToBackground } from '@/lib/messaging';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatViewProps {
  pendingExplanation?: string | null;
  onPendingConsumed?: () => void;
}

export default function ChatView({ pendingExplanation, onPendingConsumed }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { streamText, isStreaming } = useAIStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingHandledRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-trigger explanation when pending text arrives
  useEffect(() => {
    if (!pendingExplanation || pendingHandledRef.current || isStreaming) return;
    pendingHandledRef.current = true;

    async function explain() {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      // Show what we're explaining
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: `Explain this:\n\n"${pendingExplanation}"`,
      };
      setMessages((prev) => [...prev, userMsg]);

      const result = await sendToBackground({
        type: 'EXPLAIN_TEXT',
        payload: { text: pendingExplanation!, pageUrl: tab?.url ?? '' },
      }) as { ok?: boolean; prompt?: string; error?: string };

      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { id: `msg-${Date.now()}`, role: 'assistant', content: result.error! },
        ]);
      } else if (result.prompt) {
        const assistantId = `msg-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: '' },
        ]);

        await streamText(
          [
            { role: 'system', content: 'You are a patient course tutor. Explain the selected text clearly and concisely.' },
            { role: 'user', content: result.prompt },
          ],
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
            );
          },
        );
      }

      onPendingConsumed?.();
      pendingHandledRef.current = false;
    }

    explain();
  }, [pendingExplanation, isStreaming, streamText, onPendingConsumed]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      const result = await sendToBackground({
        type: 'CHAT_MESSAGE',
        payload: {
          message: userMessage.content,
          pageUrl: tab?.url ?? '',
          scrollProgress: 0.5, // TODO: get actual scroll progress from content script
        },
      }) as { ok?: boolean; prompt?: string; error?: string };

      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { id: `msg-${Date.now()}`, role: 'assistant', content: result.error! },
        ]);
        return;
      }

      if (result.prompt) {
        const assistantId = `msg-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: '' },
        ]);

        await streamText(
          [
            { role: 'system', content: 'You are a patient course tutor helping a student understand material they are currently reading.' },
            { role: 'user', content: result.prompt },
          ],
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m,
              ),
            );
          },
        );
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong. Please check your AI provider settings.',
        },
      ]);
    }
  }, [input, isStreaming, streamText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
            <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>Listen Mode</h3>
            <p style={{ color: 'var(--color-cp-text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
              Ask questions about what you've read so far.
              The AI will only reference content you've already covered — no spoilers!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user' ? 'var(--color-cp-primary)' : 'var(--color-cp-surface)',
                  color: msg.role === 'user' ? 'white' : 'var(--color-cp-text)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content || (isStreaming ? '...' : '')}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--color-cp-border)',
        display: 'flex',
        gap: '8px',
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about what you've read..."
          disabled={isStreaming}
          style={{
            flex: 1,
            padding: '10px 12px',
            background: 'var(--color-cp-surface)',
            color: 'var(--color-cp-text)',
            border: '1px solid var(--color-cp-border)',
            borderRadius: '8px',
            resize: 'none',
            fontSize: '13px',
            fontFamily: 'inherit',
            minHeight: '40px',
            maxHeight: '100px',
          }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          style={{
            padding: '10px 16px',
            background: 'var(--color-cp-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: !input.trim() || isStreaming ? 'default' : 'pointer',
            opacity: !input.trim() || isStreaming ? 0.5 : 1,
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
