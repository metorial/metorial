import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List and search documents within a mailbox. Supports filtering by date range, search query, and document status. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to list documents from'),
      page: z.number().optional().describe('Page number for pagination (starting from 1)'),
      limit: z.number().optional().describe('Number of documents per page (1–500)'),
      dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      searchQuery: z.string().optional().describe('Search query to filter documents'),
      status: z
        .enum(['parsed', 'fail', 'skipped', 'new', 'quota', 'parsing', 'exception'])
        .optional()
        .describe('Filter by document status')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('Unique identifier of the document'),
            name: z.string().optional().describe('Document name or subject'),
            status: z.string().optional().describe('Current status of the document'),
            createdAt: z.string().optional().describe('Document creation timestamp')
          })
        )
        .describe('List of documents'),
      total: z.number().optional().describe('Total number of documents matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.page !== undefined &&
      (!Number.isInteger(ctx.input.page) || ctx.input.page < 1)
    ) {
      throw createApiServiceError('page must be a whole number starting at 1.', {
        reason: 'invalid_page'
      });
    }
    if (
      ctx.input.limit !== undefined &&
      (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1 || ctx.input.limit > 500)
    ) {
      throw createApiServiceError('limit must be a whole number between 1 and 500.', {
        reason: 'invalid_page_size'
      });
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDocuments(ctx.input.mailboxId, {
      page: ctx.input.page,
      limit: ctx.input.limit,
      from: ctx.input.dateFrom,
      to: ctx.input.dateTo,
      q: ctx.input.searchQuery,
      status: ctx.input.status
    });

    let docs = Array.isArray(result) ? result : result?.docs || result?.documents || [];
    let total = result?.total ?? undefined;

    let mapped = docs.map((doc: any) => ({
      documentId: doc.doc_id || doc._id || doc.id,
      name: doc.name || doc.subject || undefined,
      status: doc.status ?? undefined,
      createdAt: doc.created_at || doc.createdAt || undefined
    }));

    return {
      output: { documents: mapped, total },
      message: `Found **${mapped.length}** document(s)${total !== undefined ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
