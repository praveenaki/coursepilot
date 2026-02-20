import type { FoxitCredentials } from './types';

const BASE_URL = 'https://na1.fusion.foxit.com';

// ─── Document Generation API ─────────────────────────────
// Takes a .docx template (base64) + JSON data → returns PDF (base64)

export class FoxitDocGenClient {
  private clientId: string;
  private clientSecret: string;

  constructor(credentials: FoxitCredentials['docGen']) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
  }

  async generatePdf(
    templateBase64: string,
    documentValues: Record<string, unknown>,
  ): Promise<string> {
    const response = await fetch(
      `${BASE_URL}/document-generation/api/GenerateDocumentBase64`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        body: JSON.stringify({
          outputFormat: 'pdf',
          documentValues,
          base64FileString: templateBase64,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Doc Gen API error (${response.status}): ${text}`);
    }

    const result = await response.json();
    return result.base64FileString;
  }

  async validate(): Promise<boolean> {
    // Minimal request to verify credentials work
    // Sending empty template will fail with a business error, not auth error
    try {
      const response = await fetch(
        `${BASE_URL}/document-generation/api/GenerateDocumentBase64`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          },
          body: JSON.stringify({
            outputFormat: 'pdf',
            documentValues: {},
            base64FileString: '',
          }),
        },
      );
      // 401/403 = bad credentials, anything else = credentials ok
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  }
}

// ─── PDF Services API ────────────────────────────────────
// Upload → Combine → Compress → Download pipeline

export class FoxitPdfServicesClient {
  private clientId: string;
  private clientSecret: string;

  constructor(credentials: FoxitCredentials['pdfServices']) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
  }

  private get headers(): Record<string, string> {
    return {
      client_id: this.clientId,
      client_secret: this.clientSecret,
    };
  }

  async upload(pdfBase64: string, filename: string): Promise<string> {
    // Convert base64 to Blob for multipart upload
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('file', blob, filename);

    const response = await fetch(
      `${BASE_URL}/pdf-services/api/documents/upload`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload error (${response.status}): ${text}`);
    }

    const result = await response.json();
    return result.documentId;
  }

  async combine(documentIds: string[]): Promise<string> {
    const response = await fetch(
      `${BASE_URL}/pdf-services/api/documents/enhance/pdf-combine`,
      {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Combine error (${response.status}): ${text}`);
    }

    const result = await response.json();
    return result.taskId;
  }

  async compress(
    documentId: string,
    compressionLevel: string = 'medium',
  ): Promise<string> {
    const response = await fetch(
      `${BASE_URL}/pdf-services/api/documents/modify/pdf-compress`,
      {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId, compressionLevel }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Compress error (${response.status}): ${text}`);
    }

    const result = await response.json();
    return result.taskId;
  }

  async pollTask(taskId: string): Promise<string> {
    let delay = 1000;
    const maxDelay = 10000;
    const timeout = 60000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const response = await fetch(
        `${BASE_URL}/pdf-services/api/tasks/${taskId}`,
        { headers: this.headers },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Poll error (${response.status}): ${text}`);
      }

      const result = await response.json();

      if (result.status === 'completed' || result.status === 'success') {
        return result.resultDocumentId;
      }

      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(`Task failed: ${result.error || 'Unknown error'}`);
      }

      // Exponential backoff: 1s → 1.5s → 2.25s → ... → 10s cap
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }

    throw new Error('Task polling timed out after 60s');
  }

  async download(documentId: string): Promise<string> {
    const response = await fetch(
      `${BASE_URL}/pdf-services/api/documents/${documentId}/download`,
      { headers: this.headers },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Download error (${response.status}): ${text}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async validate(): Promise<boolean> {
    try {
      // Try listing tasks — will return empty or error based on auth
      const response = await fetch(
        `${BASE_URL}/pdf-services/api/tasks/nonexistent`,
        { headers: this.headers },
      );
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  }
}
