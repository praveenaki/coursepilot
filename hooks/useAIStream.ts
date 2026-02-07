import { useState, useCallback, useRef } from 'react';
import { PORT_NAMES } from '@/lib/messaging';
import type { StreamPortMessage } from '@/lib/messaging';
import type { AIMessage } from '@/lib/types';

interface UseAIStreamReturn {
  streamText: (
    messages: AIMessage[],
    onChunk?: (chunk: string) => void,
  ) => Promise<string>;
  isStreaming: boolean;
  streamedText: string;
  abort: () => void;
}

export function useAIStream(): UseAIStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const portRef = useRef<ReturnType<typeof browser.runtime.connect> | null>(null);

  const abort = useCallback(() => {
    portRef.current?.disconnect();
    portRef.current = null;
    setIsStreaming(false);
  }, []);

  const streamText = useCallback(
    (
      messages: AIMessage[],
      onChunk?: (chunk: string) => void,
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        setIsStreaming(true);
        setStreamedText('');
        let fullText = '';

        const port = browser.runtime.connect({ name: PORT_NAMES.AI_STREAM });
        portRef.current = port;

        const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        port.onMessage.addListener((msg: StreamPortMessage) => {
          if (msg.requestId !== requestId) return;

          switch (msg.type) {
            case 'STREAM_START':
              break;
            case 'STREAM_CHUNK':
              fullText += msg.chunk;
              setStreamedText(fullText);
              onChunk?.(msg.chunk);
              break;
            case 'STREAM_END':
              setIsStreaming(false);
              port.disconnect();
              portRef.current = null;
              resolve(fullText);
              break;
            case 'STREAM_ERROR':
              setIsStreaming(false);
              port.disconnect();
              portRef.current = null;
              reject(new Error(msg.error));
              break;
          }
        });

        port.onDisconnect.addListener(() => {
          if (isStreaming) {
            setIsStreaming(false);
            portRef.current = null;
            resolve(fullText);
          }
        });

        // Send the stream request
        port.postMessage({ type: 'STREAM_REQUEST', requestId, messages });
      });
    },
    [isStreaming],
  );

  return { streamText, isStreaming, streamedText, abort };
}
