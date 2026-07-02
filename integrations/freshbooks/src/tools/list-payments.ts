import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Search and list payments in FreshBooks. Supports filtering by client, invoice, date range, and payment type. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)'),
      clientId: z.number().optional().describe('Filter by client ID'),
      invoiceId: z.number().optional().describe('Filter by invoice ID')
    })
  )
  .output(
    z.object({
      payments: z.array(
        z.object({
          paymentId: z.number(),
          invoiceId: z.number().nullable().optional(),
          clientId: z.number().nullable().optional(),
          amount: z.any().optional(),
          date: z.string().nullable().optional(),
          paymentType: z.string().nullable().optional(),
          note: z.string().nullable().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let params: Record<string, string | number> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;
    if (ctx.input.clientId) params['search[clientid]'] = ctx.input.clientId;
    if (ctx.input.invoiceId) params['search[invoiceid]'] = ctx.input.invoiceId;

    let result = await client.listPayments(params);

    let payments = (result.payments || []).map((p: any) => ({
      paymentId: p.id || p.paymentid,
      invoiceId: p.invoiceid,
      clientId: p.clientid,
      amount: p.amount,
      date: p.date,
      paymentType: p.type,
      note: p.note
    }));

    return {
      output: {
        payments,
        totalCount: result.total || 0,
        currentPage: result.page || 1,
        totalPages: result.pages || 1
      },
      message: `Found **${result.total || 0}** payments (page ${result.page || 1} of ${result.pages || 1}).`
    };
  })
  .build();
