import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List documents in a specific mailbox. Supports filtering by status, date range, and search. Use this to find documents, check processing status, or retrieve parsed results.`,
  instructions: [
    'Document statuses: INCOMING (received), ANALYZING, PROGRESS (being processed), PARSEDOK (successfully parsed), PARSEDKO (failed), QUOTAEXC (quota exceeded), SKIPPED.',
    'Set withResult to true to include parsed data in each document.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.number().describe('ID of the mailbox to list documents from'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page (default 25)'),
      search: z.string().optional().describe('Search text within documents'),
      ordering: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (e.g. -created)'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g. PARSEDOK, INCOMING, PROGRESS)'),
      receivedAfter: z
        .string()
        .optional()
        .describe('Filter documents received after this date (ISO 8601)'),
      receivedBefore: z
        .string()
        .optional()
        .describe('Filter documents received before this date (ISO 8601)'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for date filters (e.g. America/New_York)'),
      withResult: z.boolean().optional().describe('Include parsed result data in response')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of results on current page'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      documents: z.array(
        z.object({
          documentId: z.number().describe('Document ID'),
          mailboxId: z.number().describe('Mailbox ID this document belongs to'),
          status: z.string().describe('Processing status'),
          fileName: z.string().describe('Original file name'),
          contentType: z.string().nullable().describe('MIME content type'),
          created: z.string().describe('Upload timestamp (ISO 8601)'),
          modified: z.string().describe('Last modification timestamp (ISO 8601)'),
          creditUsage: z.number().describe('Credits consumed by this document'),
          parsedResult: z
            .record(z.string(), z.any())
            .nullable()
            .describe(
              'Parsed/extracted data (if withResult was true and document is processed)'
            )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDocuments(ctx.input.mailboxId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      status: ctx.input.status,
      receivedAfter: ctx.input.receivedAfter,
      receivedBefore: ctx.input.receivedBefore,
      tz: ctx.input.timezone,
      withResult: ctx.input.withResult
    });

    let documents = result.results.map(d => ({
      documentId: d.id,
      mailboxId: d.parser,
      status: d.status,
      fileName: d.file_name,
      contentType: d.content_type,
      created: d.created,
      modified: d.modified,
      creditUsage: d.credit_usage,
      parsedResult: d.result
    }));

    return {
      output: {
        count: result.count,
        currentPage: result.current,
        totalPages: result.total,
        documents
      },
      message: `Found **${result.count}** document(s) on page ${result.current} of ${result.total} in mailbox ${ctx.input.mailboxId}.`
    };
  })
  .build();
