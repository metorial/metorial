import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieve a list of documents from BoloForms. Supports filtering by document type (PDFs, forms, templates), search queries, date ranges, and pagination. Can also retrieve a specific document by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().optional().describe('Specific document ID to retrieve'),
      filter: z
        .string()
        .optional()
        .describe('Filter documents by type, e.g. "PDF", "FORM", "TEMPLATE", "ALL"'),
      query: z
        .string()
        .optional()
        .describe('Search query to filter documents by name or content'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of documents per page'),
      sortBy: z.string().optional().describe('Field to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      dateFrom: z.string().optional().describe('Start date for filtering (ISO format)'),
      dateTo: z.string().optional().describe('End date for filtering (ISO format)')
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
          totalDocuments: z.number().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BoloFormsClient({ token: ctx.auth.token });

    let result = await client.getDocuments({
      documentId: ctx.input.documentId,
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
    let pagination = result.pagination;

    return {
      output: {
        documents: Array.isArray(documents) ? documents : [],
        pagination
      },
      message: `Retrieved **${Array.isArray(documents) ? documents.length : 0}** documents${ctx.input.filter ? ` (filter: ${ctx.input.filter})` : ''}${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
