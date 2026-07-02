import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let invoiceSchema = z.object({
  invoiceId: z.string().describe('Unique invoice identifier'),
  status: z.string().describe('Invoice status (draft, open, paid, past_due, void)'),
  number: z.string().nullable().describe('Invoice number'),
  dueDate: z.string().nullable().describe('ISO 8601 due date'),
  emailAddress: z.string().nullable().describe('Customer email'),
  userId: z.string().nullable().describe('User ID'),
  username: z.string().nullable().describe('Username'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `List invoices in your Whop company. Filter by status or product. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company ID. Uses config companyId if not provided.'),
      statuses: z
        .array(z.enum(['draft', 'open', 'paid', 'past_due', 'void']))
        .optional()
        .describe('Filter by invoice status'),
      productIds: z.array(z.string()).optional().describe('Filter by product IDs'),
      order: z.enum(['id', 'created_at', 'due_date']).optional().describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of results (max 100)')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let companyId = ctx.input.companyId || ctx.config.companyId;
    if (!companyId) throw new Error('companyId is required');

    let client = new WhopClient(ctx.auth.token);
    let result = await client.listInvoices({
      companyId,
      statuses: ctx.input.statuses,
      productIds: ctx.input.productIds,
      order: ctx.input.order,
      direction: ctx.input.direction,
      after: ctx.input.cursor,
      first: ctx.input.limit
    });

    let invoices = (result.data || []).map((inv: any) => ({
      invoiceId: inv.id,
      status: inv.status,
      number: inv.number || null,
      dueDate: inv.due_date || null,
      emailAddress: inv.email_address || null,
      userId: inv.user?.id || null,
      username: inv.user?.username || null,
      createdAt: inv.created_at
    }));

    return {
      output: {
        invoices,
        hasNextPage: result.page_info?.has_next_page || false,
        endCursor: result.page_info?.end_cursor || null
      },
      message: `Found **${invoices.length}** invoices.${result.page_info?.has_next_page ? ' More results available.' : ''}`
    };
  })
  .build();
