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
      uploadedAt: z.string().describe('Timestamp when the document was uploaded'),
      importedAt: z.string().describe('Timestamp when the document was imported'),
      ocrAt: z.string().describe('Timestamp when OCR was completed'),
      preprocessedAt: z.string().describe('Timestamp when preprocessing was completed'),
      parsedAt: z.string().describe('Timestamp when parsing was completed'),
      webhookAt: z.string().describe('Timestamp when webhook was dispatched'),
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
        uploadedAt: status.uploadedAt,
        importedAt: status.importedAt,
        ocrAt: status.ocrAt,
        preprocessedAt: status.preprocessedAt,
        parsedAt: status.parsedAt,
        webhookAt: status.webhookAt,
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
