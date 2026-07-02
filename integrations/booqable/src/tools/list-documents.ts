import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List invoices, quotes, and contracts. Supports filtering by document type, status, order, and date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page (default 25)'),
      filterDocumentType: z
        .enum(['invoice', 'quote', 'contract'])
        .optional()
        .describe('Filter by document type'),
      filterOrderId: z.string().optional().describe('Filter by order ID'),
      filterStatus: z.string().optional().describe('Filter by document status'),
      filterArchived: z.boolean().optional().describe('Filter by archived status'),
      sort: z.string().optional().describe('Sort field (prefix with - for descending)')
    })
  )
  .output(
    z.object({
      documents: z.array(z.record(z.string(), z.any())).describe('List of document records'),
      totalCount: z.number().optional().describe('Total number of matching documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let filters: Record<string, string> = {};
    if (ctx.input.filterDocumentType) filters.document_type = ctx.input.filterDocumentType;
    if (ctx.input.filterOrderId) filters.order_id = ctx.input.filterOrderId;
    if (ctx.input.filterStatus) filters.status = ctx.input.filterStatus;
    if (ctx.input.filterArchived !== undefined)
      filters.archived = String(ctx.input.filterArchived);

    let response = await client.listDocuments({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters,
      sort: ctx.input.sort,
      include: ['order']
    });

    let documents = flattenResourceList(response);

    return {
      output: {
        documents,
        totalCount: response?.meta?.total_count
      },
      message: `Found ${documents.length} document(s).`
    };
  })
  .build();
