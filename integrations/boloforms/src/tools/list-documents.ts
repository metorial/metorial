import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieve single-signature PDFs or PDF templates from a BoloForms workspace, including document IDs, statuses, and signing progress. Supply the workspace UUID associated with the API key. Supports document type, status, archive, date range, and pagination filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace UUID associated with the API key; required for document listing'),
      documentType: z
        .enum(['PDF', 'PDF_TEMPLATE'])
        .optional()
        .describe(
          'PDF for single-signature PDFs or PDF_TEMPLATE for templates; defaults to PDF'
        ),
      status: z
        .enum([
          'ALL',
          'DRAFT',
          'SENT',
          'SIGNED',
          'COMPLETED',
          'DECLINED',
          'EXPIRED',
          'CANCELLED',
          'VOID',
          'TEMPLATE',
          'DELETED',
          'UNPAID',
          'PAID',
          'SENT VIA LINK'
        ])
        .optional()
        .describe('Document status filter; only supported for PDF documents'),
      archive: z
        .boolean()
        .optional()
        .describe('Return archived documents when true; defaults to false'),
      documentId: z.string().optional().describe('Specific document ID to retrieve'),
      filter: z
        .string()
        .optional()
        .describe(
          'Legacy filter forwarded to the API; use documentType for current type filtering'
        ),
      query: z.string().optional().describe('Legacy search query forwarded to the API'),
      page: z.number().optional().describe('Whole-number page between 1 and 10000'),
      limit: z.number().optional().describe('Whole-number page size between 1 and 100'),
      sortBy: z
        .string()
        .optional()
        .describe('Legacy sort field; the current API sorts by createdAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      dateFrom: z
        .string()
        .optional()
        .describe('Inclusive start date for createdAt (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Inclusive end date for createdAt (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      documents: z
        .array(z.record(z.string(), z.any()))
        .describe('List of documents matching the query'),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          totalPages: z.number().optional(),
          totalDocuments: z.number().optional(),
          hasNextPage: z.boolean().optional(),
          hasPreviousPage: z.boolean().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BoloFormsClient({ token: ctx.auth.token });

    let result = await client.getDocuments({
      documentId: ctx.input.documentId,
      workspaceId: ctx.input.workspaceId,
      documentType: ctx.input.documentType,
      status: ctx.input.status,
      archive: ctx.input.archive,
      filter: ctx.input.filter,
      query: ctx.input.query,
      page: ctx.input.page,
      limit: ctx.input.limit,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo
    });

    let documents = result.documents ?? result.data ?? [];
    let pagination = result.pagination ?? undefined;

    return {
      output: {
        documents: Array.isArray(documents) ? documents : [],
        pagination
      },
      message: `Retrieved **${Array.isArray(documents) ? documents.length : 0}** documents${ctx.input.filter ? ` (filter: ${ctx.input.filter})` : ''}${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
