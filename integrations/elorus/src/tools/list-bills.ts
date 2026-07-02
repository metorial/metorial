import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBills = SlateTool.create(spec, {
  name: 'List Bills',
  key: 'list_bills',
  description: `Search and list bills (supplier invoices/purchase documents) in your Elorus organization. Supports filtering by status, supplier, self-billed flag, date range, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Free-text search across supplier name, document type, line items, and notes.'
        ),
      status: z
        .enum(['draft', 'pending', 'issued', 'partial', 'unpaid', 'overdue', 'paid', 'void'])
        .optional()
        .describe('Filter by bill status.'),
      supplierId: z.string().optional().describe('Filter by supplier contact ID.'),
      selfBilled: z.boolean().optional().describe('Filter for self-billed documents only.'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort field: date, total, supplier__display_name, modified, created. Prefix with "-" for descending.'
        ),
      periodFrom: z.string().optional().describe('Filter from this date (YYYY-MM-DD).'),
      periodTo: z.string().optional().describe('Filter until this date (YYYY-MM-DD).'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching bills.'),
      bills: z.array(z.any()).describe('Array of bill objects.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listBills({
      search: ctx.input.search,
      status: ctx.input.status,
      supplier: ctx.input.supplierId,
      selfBilled:
        ctx.input.selfBilled !== undefined ? (ctx.input.selfBilled ? '1' : '0') : undefined,
      ordering: ctx.input.ordering,
      periodFrom: ctx.input.periodFrom,
      periodTo: ctx.input.periodTo,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        bills: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** bill(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
