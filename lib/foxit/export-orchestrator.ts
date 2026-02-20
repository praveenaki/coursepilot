import { FoxitDocGenClient, FoxitPdfServicesClient } from './foxit-client';
import { aggregateCertificateData, aggregateStudyReportData } from './data-aggregator';
import { loadTemplate } from './template-loader';
import type { ExportStatus, FoxitCredentials } from './types';
import { exportStatusStorage, foxitCredentialsStorage } from '@/utils/storage';

type ProgressCallback = (status: ExportStatus) => void;

async function setStatus(status: ExportStatus): Promise<void> {
  await exportStatusStorage.setValue(status);
}

/**
 * Full export pipeline:
 *   Collect → Certificate PDF → Report PDF → Combine → Compress → Download
 *
 * Progress is reported via exportStatusStorage so the UI can watch reactively.
 * Returns the final PDF as base64 + a suggested filename.
 */
export async function exportLearningPortfolio(
  courseId: string,
): Promise<{ pdfBase64: string; fileName: string }> {
  try {
    const credentials = await foxitCredentialsStorage.getValue();
    const docGen = new FoxitDocGenClient(credentials.docGen);
    const pdfServices = new FoxitPdfServicesClient(credentials.pdfServices);

    // Step 1: Collect data
    await setStatus({ step: 'collecting' });
    const [certData, reportData, certTemplate, reportTemplate] =
      await Promise.all([
        aggregateCertificateData(courseId),
        aggregateStudyReportData(courseId),
        loadTemplate('certificate-template.docx'),
        loadTemplate('study-report-template.docx'),
      ]);

    // Step 2: Generate certificate PDF
    await setStatus({ step: 'generating-certificate' });
    const certPdfBase64 = await docGen.generatePdf(
      certTemplate,
      certData as unknown as Record<string, unknown>,
    );

    // Step 3: Generate report PDF
    await setStatus({ step: 'generating-report' });
    const reportPdfBase64 = await docGen.generatePdf(
      reportTemplate,
      reportData as unknown as Record<string, unknown>,
    );

    // Step 4: Upload both + combine
    await setStatus({ step: 'combining' });
    const [certDocId, reportDocId] = await Promise.all([
      pdfServices.upload(certPdfBase64, 'certificate.pdf'),
      pdfServices.upload(reportPdfBase64, 'report.pdf'),
    ]);
    const combineTaskId = await pdfServices.combine([certDocId, reportDocId]);
    const combinedDocId = await pdfServices.pollTask(combineTaskId);

    // Step 5: Compress
    await setStatus({ step: 'compressing' });
    const compressTaskId = await pdfServices.compress(combinedDocId);
    const compressedDocId = await pdfServices.pollTask(compressTaskId);

    // Step 6: Download final result
    await setStatus({ step: 'downloading' });
    const finalPdf = await pdfServices.download(compressedDocId);

    // Sanitize course name for filename
    const safeName = (certData.courseName || 'course')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const fileName = `${safeName}-learning-portfolio.pdf`;

    await setStatus({ step: 'complete' });
    return { pdfBase64: finalPdf, fileName };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Export failed';
    await setStatus({ step: 'error', message });
    throw error;
  }
}
