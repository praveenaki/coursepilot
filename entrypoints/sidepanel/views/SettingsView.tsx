import { useState, useEffect, useCallback } from 'react';
import { sendToBackground } from '@/lib/messaging';
import type { AIProviderType, Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { FoxitCredentials } from '@/lib/foxit/types';
import { DEFAULT_FOXIT_CREDENTIALS } from '@/lib/foxit/types';

const PROVIDERS: { id: AIProviderType; name: string; description: string }[] = [
  { id: 'anthropic', name: 'Anthropic (Claude)', description: 'Claude Sonnet 4.5 — best for education' },
  { id: 'openai', name: 'OpenAI (GPT)', description: 'GPT-4o — fast and capable' },
  { id: 'gemini', name: 'Google (Gemini)', description: 'Gemini 3 Flash Preview — fast and free tier' },
  { id: 'gateway', name: 'Local Gateway', description: 'Ollama, LM Studio, or custom endpoint' },
];

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [apiKeys, setApiKeys] = useState<Record<AIProviderType, string>>({
    anthropic: '',
    openai: '',
    gemini: '',
    gateway: '',
  });
  const [gatewayUrl, setGatewayUrl] = useState('http://127.0.0.1:18789');
  const [validating, setValidating] = useState<AIProviderType | null>(null);
  const [validationResult, setValidationResult] = useState<{
    provider: AIProviderType;
    valid: boolean;
    error?: string;
  } | null>(null);

  // Foxit state
  const [foxitCreds, setFoxitCreds] = useState<FoxitCredentials>(DEFAULT_FOXIT_CREDENTIALS);
  const [foxitValidating, setFoxitValidating] = useState(false);
  const [foxitValidationResult, setFoxitValidationResult] = useState<{
    valid: boolean;
    docGen?: boolean;
    pdfServices?: boolean;
    error?: string;
  } | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = (await sendToBackground({ type: 'GET_SETTINGS' })) as Settings;
    if (s) setSettings(s);
  }

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await sendToBackground({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
    },
    [settings],
  );

  const handleApiKeyChange = useCallback(
    async (provider: AIProviderType, key: string) => {
      setApiKeys((prev) => ({ ...prev, [provider]: key }));
      await sendToBackground({ type: 'SET_API_KEY', payload: { provider, key } });
    },
    [],
  );

  const handleValidate = useCallback(
    async (provider: AIProviderType) => {
      setValidating(provider);
      setValidationResult(null);
      const result = (await sendToBackground({
        type: 'VALIDATE_PROVIDER',
        payload: { provider },
      })) as { provider: AIProviderType; valid: boolean; error?: string };
      setValidationResult(result);
      setValidating(null);
    },
    [],
  );

  const handleFoxitCredChange = useCallback(
    async (
      api: 'docGen' | 'pdfServices',
      field: 'clientId' | 'clientSecret',
      value: string,
    ) => {
      const updated = {
        ...foxitCreds,
        [api]: { ...foxitCreds[api], [field]: value },
      };
      setFoxitCreds(updated);
      await sendToBackground({ type: 'SET_FOXIT_CREDENTIALS', payload: updated });
    },
    [foxitCreds],
  );

  const handleFoxitValidate = useCallback(async () => {
    setFoxitValidating(true);
    setFoxitValidationResult(null);
    const result = (await sendToBackground({ type: 'VALIDATE_FOXIT' })) as {
      valid: boolean;
      docGen?: boolean;
      pdfServices?: boolean;
      error?: string;
    };
    setFoxitValidationResult(result);
    setFoxitValidating(false);
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      {/* AI Provider Selection */}
      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>AI Provider</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => updateSetting('activeProvider', provider.id)}
              style={{
                padding: '10px 14px',
                background:
                  settings.activeProvider === provider.id
                    ? 'var(--color-cp-primary)'
                    : 'var(--color-cp-surface)',
                color:
                  settings.activeProvider === provider.id
                    ? 'white'
                    : 'var(--color-cp-text)',
                border: `1px solid ${
                  settings.activeProvider === provider.id
                    ? 'var(--color-cp-primary)'
                    : 'var(--color-cp-border)'
                }`,
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '13px' }}>{provider.name}</div>
              <div style={{ fontSize: '11px', color: settings.activeProvider === provider.id ? 'rgba(255,255,255,0.7)' : 'var(--color-cp-text-muted)', marginTop: '2px' }}>
                {provider.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* API Key for active provider */}
      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
          API Key — {PROVIDERS.find((p) => p.id === settings.activeProvider)?.name}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="password"
            value={apiKeys[settings.activeProvider]}
            onChange={(e) => handleApiKeyChange(settings.activeProvider, e.target.value)}
            placeholder="Enter API key..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--color-cp-surface)',
              color: 'var(--color-cp-text)',
              border: '1px solid var(--color-cp-border)',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => handleValidate(settings.activeProvider)}
            disabled={validating !== null}
            style={{
              padding: '8px 12px',
              background: 'var(--color-cp-surface)',
              color: 'var(--color-cp-text)',
              border: '1px solid var(--color-cp-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {validating === settings.activeProvider ? '...' : 'Test'}
          </button>
        </div>
        {validationResult && validationResult.provider === settings.activeProvider && (
          <div
            style={{
              marginTop: '6px',
              fontSize: '12px',
              color: validationResult.valid ? 'var(--color-cp-success)' : 'var(--color-cp-danger)',
            }}
          >
            {validationResult.valid ? '✓ Connection successful' : `✗ ${validationResult.error || 'Connection failed'}`}
          </div>
        )}

        {/* Gateway URL (only for gateway provider) */}
        {settings.activeProvider === 'gateway' && (
          <div style={{ marginTop: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)', display: 'block', marginBottom: '4px' }}>
              Gateway URL
            </label>
            <input
              type="text"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="http://127.0.0.1:18789"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--color-cp-surface)',
                color: 'var(--color-cp-text)',
                border: '1px solid var(--color-cp-border)',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            />
          </div>
        )}
      </section>

      {/* Foxit PDF Services */}
      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
          Foxit PDF Services
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--color-cp-text-muted)', marginBottom: '12px' }}>
          Enable PDF portfolio export with Foxit APIs
        </p>

        {/* Doc Gen credentials */}
        <label style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)', display: 'block', marginBottom: '4px' }}>
          Document Generation — Client ID
        </label>
        <input
          type="password"
          value={foxitCreds.docGen.clientId}
          onChange={(e) => handleFoxitCredChange('docGen', 'clientId', e.target.value)}
          placeholder="foxit_..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--color-cp-surface)',
            color: 'var(--color-cp-text)',
            border: '1px solid var(--color-cp-border)',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            marginBottom: '8px',
          }}
        />

        <label style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)', display: 'block', marginBottom: '4px' }}>
          Document Generation — Client Secret
        </label>
        <input
          type="password"
          value={foxitCreds.docGen.clientSecret}
          onChange={(e) => handleFoxitCredChange('docGen', 'clientSecret', e.target.value)}
          placeholder="Enter client secret..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--color-cp-surface)',
            color: 'var(--color-cp-text)',
            border: '1px solid var(--color-cp-border)',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            marginBottom: '12px',
          }}
        />

        {/* PDF Services credentials */}
        <label style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)', display: 'block', marginBottom: '4px' }}>
          PDF Services — Client ID
        </label>
        <input
          type="password"
          value={foxitCreds.pdfServices.clientId}
          onChange={(e) => handleFoxitCredChange('pdfServices', 'clientId', e.target.value)}
          placeholder="foxit_..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--color-cp-surface)',
            color: 'var(--color-cp-text)',
            border: '1px solid var(--color-cp-border)',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            marginBottom: '8px',
          }}
        />

        <label style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)', display: 'block', marginBottom: '4px' }}>
          PDF Services — Client Secret
        </label>
        <input
          type="password"
          value={foxitCreds.pdfServices.clientSecret}
          onChange={(e) => handleFoxitCredChange('pdfServices', 'clientSecret', e.target.value)}
          placeholder="Enter client secret..."
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--color-cp-surface)',
            color: 'var(--color-cp-text)',
            border: '1px solid var(--color-cp-border)',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            marginBottom: '8px',
          }}
        />

        <button
          onClick={handleFoxitValidate}
          disabled={foxitValidating}
          style={{
            padding: '8px 16px',
            background: 'var(--color-cp-surface)',
            color: 'var(--color-cp-text)',
            border: '1px solid var(--color-cp-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {foxitValidating ? 'Testing...' : 'Test Connection'}
        </button>

        {foxitValidationResult && (
          <div style={{ marginTop: '6px', fontSize: '12px' }}>
            {foxitValidationResult.valid ? (
              <span style={{ color: 'var(--color-cp-success)' }}>
                Both APIs connected successfully
              </span>
            ) : (
              <span style={{ color: 'var(--color-cp-danger)' }}>
                {foxitValidationResult.error ??
                  `Doc Gen: ${foxitValidationResult.docGen ? 'OK' : 'Failed'} · PDF Services: ${foxitValidationResult.pdfServices ? 'OK' : 'Failed'}`}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Quiz Settings */}
      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Quiz Settings</h3>

        <SettingRow label="Mastery Threshold">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={settings.masteryThreshold}
              onChange={(e) => updateSetting('masteryThreshold', Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '36px' }}>
              {settings.masteryThreshold}%
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Questions per Quiz">
          <select
            value={settings.questionsPerQuiz}
            onChange={(e) => updateSetting('questionsPerQuiz', Number(e.target.value))}
            style={{
              padding: '6px 10px',
              background: 'var(--color-cp-surface)',
              color: 'var(--color-cp-text)',
              border: '1px solid var(--color-cp-border)',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>
                {n} questions
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Auto-navigate after mastery">
          <ToggleSwitch
            checked={settings.autoNavigate}
            onChange={(v) => updateSetting('autoNavigate', v)}
          />
        </SettingRow>
      </section>

      {/* UI Settings */}
      <section>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Interface</h3>

        <SettingRow label="Show quiz FAB button">
          <ToggleSwitch
            checked={settings.showFAB}
            onChange={(v) => updateSetting('showFAB', v)}
          />
        </SettingRow>

        <SettingRow label="Show 'Explain this' popup">
          <ToggleSwitch
            checked={settings.showSelectionPopup}
            onChange={(v) => updateSetting('showSelectionPopup', v)}
          />
        </SettingRow>
      </section>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--color-cp-border)',
      }}
    >
      <span style={{ fontSize: '13px' }}>{label}</span>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        background: checked ? 'var(--color-cp-primary)' : 'var(--color-cp-border)',
        transition: 'background 0.2s ease',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '8px',
          background: 'white',
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  );
}
