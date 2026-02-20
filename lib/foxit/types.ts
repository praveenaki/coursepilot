// ─── Foxit API Credentials ────────────────────────────────
// Two separate APIs, each with its own client_id/client_secret

export interface FoxitCredentials {
  docGen: {
    clientId: string;
    clientSecret: string;
  };
  pdfServices: {
    clientId: string;
    clientSecret: string;
  };
}

export const DEFAULT_FOXIT_CREDENTIALS: FoxitCredentials = {
  docGen: { clientId: '', clientSecret: '' },
  pdfServices: { clientId: '', clientSecret: '' },
};

// ─── Export Pipeline Status ──────────────────────────────
// Discriminated union so UI can show a 6-step progress bar

export type ExportStatus =
  | { step: 'idle' }
  | { step: 'collecting' }
  | { step: 'generating-certificate' }
  | { step: 'generating-report' }
  | { step: 'combining' }
  | { step: 'compressing' }
  | { step: 'downloading' }
  | { step: 'complete' }
  | { step: 'error'; message: string };

export const EXPORT_STEPS = [
  'collecting',
  'generating-certificate',
  'generating-report',
  'combining',
  'compressing',
  'downloading',
] as const;

// ─── Certificate Template Data ───────────────────────────
// Flat JSON — maps 1:1 to {{ token }} in certificate-template.docx

export interface CertificateData {
  courseName: string;
  overallMastery: string;       // e.g. "87%"
  completionDate: string;       // e.g. "February 20, 2026"
  bloomLevelsAchieved: string;  // e.g. "Remember, Understand, Apply, Analyze"
  totalPagesStudied: string;    // e.g. "12"
  totalQuizzesTaken: string;    // e.g. "8"
  masteryThreshold: string;     // e.g. "80%"
}

// ─── Study Report Template Data ──────────────────────────
// Contains arrays for {{ TableStart:xxx }} loops in study-report-template.docx

export interface StudyReportData {
  // Overview section
  courseName: string;
  overallMastery: string;
  totalPages: string;
  pagesMastered: string;
  completionDate: string;

  // Page Progress table
  pages: Array<{
    pageTitle: string;
    masteryScore: string;
    status: string;  // "Mastered", "In Progress", "Not Started"
  }>;

  // Bloom's Performance table
  bloomPerformance: Array<{
    level: string;
    questionsAttempted: string;
    correctRate: string;
  }>;

  // Questions to Review table (max 20)
  missedQuestions: Array<{
    question: string;
    bloomLevel: string;
    correctAnswer: string;
  }>;

  // Chat Insights table
  chatTopics: Array<{
    topic: string;
    messageCount: string;
  }>;
}
