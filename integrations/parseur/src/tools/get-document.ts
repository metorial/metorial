import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a specific document by ID, including its processing status and parsed result data. Optionally include processing logs to troubleshoot issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.number().describe('ID of the document to retrieve'),
      includeLogs: z
        .boolean()
        .optional()
        .describe('Also fetch processing logs for this document')
    })
  )
  .output(
    z.object({
      documentId: z.number().describe('Document ID'),
      mailboxId: z.number().describe('Mailbox ID this document belongs to'),
      status: z.string().describe('Processing status (e.g. PARSEDOK, INCOMING, PROGRESS)'),
      fileName: z.string().describe('Original file name'),
      fileUrl: z.string().nullable().describe('URL to download the original file'),
      contentType: z.string().nullable().describe('MIME content type'),
      created: z.string().describe('Upload timestamp'),
      modified: z.string().describe('Last modification timestamp'),
      creditUsage: z.number().describe('Credits consumed'),
      parsedResult: z.record(z.string(), z.any()).nullable().describe('Extracted/parsed data'),
      logs: z
        .array(
          z.object({
            status: z.string(),
            source: z.string(),
            message: z.string(),
            created: z.string()
          })
        )
        .nullable()
        .describe('Processing logs (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let doc = await client.getDocument(ctx.input.documentId);

    let logs: { status: string; source: string; message: string; created: string }[] | null =
      null;
    if (ctx.input.includeLogs) {
      let logResult = await client.getDocumentLogs(ctx.input.documentId);
      logs = logResult.results.map(l => ({
        status: l.status,
        source: l.source,
        message: l.message,
        created: l.created
      }));
    }

    return {
      output: {
        documentId: doc.id,
        mailboxId: doc.parser,
        status: doc.status,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        contentType: doc.content_type,
        created: doc.created,
        modified: doc.modified,
        creditUsage: doc.credit_usage,
        parsedResult: doc.result,
        logs
      },
      message: `Document **${doc.file_name}** (ID: ${doc.id}) — status: **${doc.status}**.${logs ? ` ${logs.length} log entries retrieved.` : ''}`
    };
  })
  .build();
