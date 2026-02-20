import { useState, useEffect, useCallback } from 'react';
import QuizView from './views/QuizView';
import ChatView from './views/ChatView';
import ResearchView from './views/ResearchView';
import ProgressView from './views/ProgressView';
import SettingsView from './views/SettingsView';
import { pendingExplanationStorage, pendingResearchStorage } from '@/utils/storage';

type Tab = 'quiz' | 'chat' | 'research' | 'progress' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'quiz', label: 'Quiz', icon: '🎯' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'research', label: 'Research', icon: '🔍' },
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('quiz');
  const [pendingText, setPendingText] = useState<string | null>(null);

  // Watch for pending explanation requests (from "Explain this" button)
  useEffect(() => {
    pendingExplanationStorage.getValue().then((pending) => {
      if (pending && Date.now() - pending.timestamp < 10000) {
        setPendingText(pending.text);
        setActiveTab('chat');
        pendingExplanationStorage.setValue(null);
      }
    });

    const unwatch = pendingExplanationStorage.watch((pending) => {
      if (pending && Date.now() - pending.timestamp < 10000) {
        setPendingText(pending.text);
        setActiveTab('chat');
        pendingExplanationStorage.setValue(null);
      }
    });

    return unwatch;
  }, []);

  // Watch for pending research requests (from "Research" button)
  useEffect(() => {
    pendingResearchStorage.getValue().then((pending) => {
      if (pending && Date.now() - pending.timestamp < 10000) {
        setActiveTab('research');
        // ResearchView handles consuming the pending request
      }
    });

    const unwatch = pendingResearchStorage.watch((pending) => {
      if (pending && Date.now() - pending.timestamp < 10000) {
        setActiveTab('research');
      }
    });

    return unwatch;
  }, []);

  const clearPendingText = useCallback(() => setPendingText(null), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-cp-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '20px' }}>🧭</span>
        <span style={{ fontWeight: 700, fontSize: '16px' }}>CoursePilot</span>
      </header>

      {/* Tab Bar */}
      <nav
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-cp-border)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: activeTab === tab.id ? 'var(--color-cp-surface)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-cp-primary-light)' : 'var(--color-cp-text-muted)',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-cp-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'quiz' && <QuizView />}
        {activeTab === 'chat' && <ChatView pendingExplanation={pendingText} onPendingConsumed={clearPendingText} />}
        {activeTab === 'research' && <ResearchView />}
        {activeTab === 'progress' && <ProgressView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
