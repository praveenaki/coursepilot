import { useState, useEffect } from 'react';
import { sendToBackground } from '@/lib/messaging';
import { exportStatusStorage, foxitCredentialsStorage } from '@/utils/storage';
import type { ExportStatus } from '@/lib/foxit/types';
import { EXPORT_STEPS } from '@/lib/foxit/types';

const STEP_LABELS: Record<string, string> = {
  collecting: 'Collecting data...',
  'generating-certificate': 'Generating certificate...',
  'generating-report': 'Generating report...',
  combining: 'Merging PDFs...',
  compressing: 'Optimizing...',
  downloading: 'Downloading...',
};

export default function ExportButton({ courseId }: { courseId: string }) {
  const [status, setStatus] = useState<ExportStatus>({ step: 'idle' });
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    // Check if Foxit credentials are configured
    foxitCredentialsStorage.getValue().then((creds) => {
      setConfigured(
        !!(creds.docGen.clientId && creds.pdfServices.clientId),
      );
    });

    // Watch export status for progress updates
    const unwatch = exportStatusStorage.watch((newStatus) => {
      if (newStatus) setStatus(newStatus);
    });

    return () => { unwatch(); };
  }, []);

  const isExporting =
    status.step !== 'idle' &&
    status.step !== 'complete' &&
    status.step !== 'error';

  const handleExport = async () => {
    await sendToBackground({
      type: 'EXPORT_PORTFOLIO',
      payload: { courseId },
    });
  };

  // Calculate progress percentage (0-100)
  const stepIndex = EXPORT_STEPS.indexOf(
    status.step as (typeof EXPORT_STEPS)[number],
  );
  const progressPercent =
    stepIndex >= 0
      ? Math.round(((stepIndex + 1) / EXPORT_STEPS.length) * 100)
      : 0;

  if (!configured) {
    return (
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--color-cp-surface)',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-cp-text-muted)',
            marginBottom: '4px',
          }}
        >
          Export your learning as a PDF portfolio
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-cp-text-muted)' }}>
          Set up Foxit credentials in Settings to enable export
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          width: '100%',
          padding: '12px',
          background: isExporting
            ? 'var(--color-cp-border)'
            : 'var(--color-cp-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isExporting ? 'default' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        {isExporting
          ? 'Exporting...'
          : 'Export Learning Portfolio'}
      </button>

      {/* Progress Bar (visible during export) */}
      {isExporting && (
        <div style={{ marginTop: '8px' }}>
          <div
            style={{
              height: '4px',
              background: 'var(--color-cp-border)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'var(--color-cp-primary)',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-cp-text-muted)',
              marginTop: '4px',
              textAlign: 'center',
            }}
          >
            {STEP_LABELS[status.step] ?? status.step}
          </p>
        </div>
      )}

      {/* Completion message */}
      {status.step === 'complete' && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-cp-success)',
            marginTop: '8px',
            textAlign: 'center',
          }}
        >
          Portfolio exported successfully!
        </p>
      )}

      {/* Error message */}
      {status.step === 'error' && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-cp-danger)',
            marginTop: '8px',
            textAlign: 'center',
          }}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
