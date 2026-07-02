import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Search and list invoices in your Elorus organization. Supports filtering by status, client, date range, payment status, and more.`,
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
          'Free-text search across client name, document type, sequence number, line items, and notes.'
        ),
      status: z
        .enum(['draft', 'pending', 'issued', 'partial', 'unpaid', 'overdue', 'paid', 'void'])
        .optional()
        .describe('Filter by invoice status.'),
      clientId: z.string().optional().describe('Filter by client contact ID.'),
      documentTypeId: z.string().optional().describe('Filter by document type ID.'),
      currencyCode: z
        .string()
        .optional()
        .describe('Filter by currency code (e.g. "EUR", "USD").'),
      overdue: z.boolean().optional().describe('Filter for overdue invoices only.'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort field. Options: date, total, net, due_date, modified, created. Prefix with "-" for descending.'
        ),
      periodFrom: z
        .string()
        .optional()
        .describe('Filter invoices from this date (YYYY-MM-DD). Must be used with periodTo.'),
      periodTo: z
        .string()
        .optional()
        .describe(
          'Filter invoices until this date (YYYY-MM-DD). Must be used with periodFrom.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250, default 100).'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return invoices modified after this date (ISO 8601 or YYYY-MM-DD).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching invoices.'),
      invoices: z.array(z.any()).describe('Array of invoice objects.'),
      hasMore: z.boolean().describe('Whether there are more pages of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listInvoices({
      search: ctx.input.search,
      status: ctx.input.status,
      client: ctx.input.clientId,
      documenttype: ctx.input.documentTypeId,
      currencyCode: ctx.input.currencyCode,
      overdue:
        ctx.input.overdue !== undefined ? (ctx.input.overdue ? 'yes' : 'no') : undefined,
      ordering: ctx.input.ordering,
      periodFrom: ctx.input.periodFrom,
      periodTo: ctx.input.periodTo,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      modifiedAfter: ctx.input.modifiedAfter
    });

    return {
      output: {
        totalCount: result.count,
        invoices: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** invoice(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
