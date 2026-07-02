import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `List invoices for a site with optional status filtering. Invoices represent billing documents sent to clients.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to list invoices for'),
      status: z
        .enum(['DRAFT', 'PENDING', 'VOID', 'PAID', 'UNPAID', 'REFUNDED', 'PROCESSING'])
        .optional()
        .describe('Filter by invoice status'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)'),
      sortBy: z
        .enum(['createdAt', 'updatedAt', 'dueAt', 'invoiceNumber'])
        .optional()
        .describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.string(),
          invoiceNumber: z.string(),
          status: z.string(),
          currency: z.string(),
          totalInCents: z.number(),
          amountPaidInCents: z.number(),
          amountRemainingInCents: z.number(),
          dueAt: z.string().nullable(),
          completedAt: z.string().nullable(),
          memo: z.string().nullable(),
          footer: z.string().nullable(),
          siteId: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listInvoices({
      siteId: ctx.input.siteId,
      status: ctx.input.status,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let invoices = result.items.map(inv => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      currency: inv.currency,
      totalInCents: inv.totalInCents,
      amountPaidInCents: inv.amountPaidInCents,
      amountRemainingInCents: inv.amountRemainingInCents,
      dueAt: inv.dueAt,
      completedAt: inv.completedAt,
      memo: inv.memo,
      footer: inv.footer,
      siteId: inv.siteId,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt
    }));

    return {
      output: {
        invoices,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** invoice(s). Returned ${invoices.length} on this page.`
    };
  })
  .build();
