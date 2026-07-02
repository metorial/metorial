import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Search and list invoices in FreshBooks. Supports filtering by client, status, date range, and amount. Returns paginated results with key invoice summary information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)'),
      customerId: z.number().optional().describe('Filter by client ID'),
      status: z
        .number()
        .optional()
        .describe(
          'Filter by status (1=draft, 2=sent, 3=viewed, 4=paid, 5=auto-paid, 6=partial, 7=disputed, 8=overdue)'
        ),
      dateFrom: z
        .string()
        .optional()
        .describe('Filter invoices created on or after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter invoices created on or before this date (YYYY-MM-DD)'),
      invoiceNumber: z.string().optional().describe('Filter by invoice number')
    })
  )
  .output(
    z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.number(),
          invoiceNumber: z.string().nullable().optional(),
          customerId: z.number().nullable().optional(),
          status: z.number().nullable().optional(),
          amount: z.any().optional(),
          outstandingAmount: z.any().optional(),
          currencyCode: z.string().nullable().optional(),
          createDate: z.string().nullable().optional(),
          dueDate: z.string().nullable().optional()
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
    if (ctx.input.customerId) params['search[customerid]'] = ctx.input.customerId;
    if (ctx.input.status) params['search[status]'] = ctx.input.status;
    if (ctx.input.dateFrom) params['search[date_min]'] = ctx.input.dateFrom;
    if (ctx.input.dateTo) params['search[date_max]'] = ctx.input.dateTo;
    if (ctx.input.invoiceNumber) params['search[invoice_number]'] = ctx.input.invoiceNumber;

    let result = await client.listInvoices(params);

    let invoices = (result.invoices || []).map((inv: any) => ({
      invoiceId: inv.id || inv.invoiceid,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customerid,
      status: inv.status,
      amount: inv.amount,
      outstandingAmount: inv.outstanding,
      currencyCode: inv.currency_code,
      createDate: inv.create_date,
      dueDate: inv.due_date
    }));

    return {
      output: {
        invoices,
        totalCount: result.total || 0,
        currentPage: result.page || 1,
        totalPages: result.pages || 1
      },
      message: `Found **${result.total || 0}** invoices (page ${result.page || 1} of ${result.pages || 1}).`
    };
  })
  .build();
