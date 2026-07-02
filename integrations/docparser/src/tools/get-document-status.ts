import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocumentStatus = SlateTool.create(spec, {
  name: 'Get Document Status',
  key: 'get_document_status',
  description: `Check the processing status of a specific document within a parser. Returns timestamps for each processing stage (upload, import, OCR, preprocessing, parsing, webhook dispatch) and any failed processing jobs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parserId: z.string().describe('ID of the Document Parser the document belongs to'),
      documentId: z.string().describe('ID of the document to check status for')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document'),
      token: z.string().optional().describe('Docparser document token when returned'),
      fileSource: z.string().optional().describe('How the document entered Docparser'),
      filename: z.string().optional().describe('Filename associated with the document'),
      mimeType: z.string().optional().describe('Detected MIME type'),
      pages: z.number().optional().describe('Detected page count'),
      supported: z.boolean().optional().describe('Whether Docparser supports this document'),
      importingInProgress: z.boolean().optional().describe('Whether import is still running'),
      processingInProgress: z
        .boolean()
        .optional()
        .describe('Whether parsing is still running'),
      webhookDispatchingInProgress: z
        .boolean()
        .optional()
        .describe('Whether webhook dispatching is still running'),
      uploadedAt: z.string().describe('Timestamp when the document was uploaded'),
      importedAt: z.string().describe('Timestamp when the document was imported'),
      ocrAt: z.string().describe('Timestamp when OCR was completed'),
      preprocessedAt: z.string().describe('Timestamp when preprocessing was completed'),
      parsedAt: z.string().describe('Timestamp when parsing was completed'),
      firstProcessedAt: z.string().describe('Timestamp when parsing first completed'),
      webhookAt: z.string().describe('Timestamp when webhook was dispatched'),
      dispatchedWebhook: z.boolean().optional().describe('Whether webhook dispatch completed'),
      dispatchedWebhookProblem: z
        .boolean()
        .optional()
        .describe('Whether webhook dispatch reported a problem'),
      failedJobs: z.array(z.any()).describe('List of failed processing jobs, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let status = await client.getDocumentStatus(ctx.input.parserId, ctx.input.documentId);

    let hasFailed = status.failedJobs.length > 0;
    let isParsed = !!status.parsedAt;

    return {
      output: {
        documentId: status.documentId,
        token: status.token,
        fileSource: status.fileSource,
        filename: status.filename,
        mimeType: status.mimeType,
        pages: status.pages,
        supported: status.supported,
        importingInProgress: status.importingInProgress,
        processingInProgress: status.processingInProgress,
        webhookDispatchingInProgress: status.webhookDispatchingInProgress,
        uploadedAt: status.uploadedAt,
        importedAt: status.importedAt,
        ocrAt: status.ocrAt,
        preprocessedAt: status.preprocessedAt,
        parsedAt: status.parsedAt,
        firstProcessedAt: status.firstProcessedAt,
        webhookAt: status.webhookAt,
        dispatchedWebhook: status.dispatchedWebhook,
        dispatchedWebhookProblem: status.dispatchedWebhookProblem,
        failedJobs: status.failedJobs
      },
      message: hasFailed
        ? `Document \`${ctx.input.documentId}\` has **${status.failedJobs.length}** failed job(s).`
        : isParsed
          ? `Document \`${ctx.input.documentId}\` has been fully parsed.`
          : `Document \`${ctx.input.documentId}\` is still being processed.`
    };
  })
  .build();
