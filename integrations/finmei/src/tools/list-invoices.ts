import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve a paginated list of invoices from Finmei. Returns invoice summaries including ID, code, status, amounts, currency, and dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of invoices per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('Invoice ID'),
            code: z.string().optional().describe('Invoice code/number'),
            status: z.string().optional().describe('Invoice status'),
            currency: z.string().optional().describe('Currency code'),
            amountDue: z.number().optional().describe('Amount due'),
            issueDate: z.string().optional().describe('Issue date'),
            dueDate: z.string().optional().describe('Due date')
          })
        )
        .describe('List of invoices'),
      total: z.number().optional().describe('Total number of invoices'),
      page: z.number().optional().describe('Current page'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listInvoices({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let rawInvoices = result?.data ?? result?.invoices ?? result ?? [];
    let invoicesArray = Array.isArray(rawInvoices) ? rawInvoices : [];

    let invoices = invoicesArray.map((inv: any) => ({
      invoiceId: String(inv.id),
      code: inv.code,
      status: inv.status,
      currency: inv.currency,
      amountDue: inv.amount_due ?? inv.total,
      issueDate: inv.issue_date ?? inv.date,
      dueDate: inv.due_date
    }));

    let total = result?.total ?? result?.meta?.total;
    let page = result?.page ?? result?.meta?.current_page ?? ctx.input.page;
    let totalPages = result?.total_pages ?? result?.meta?.last_page;

    return {
      output: {
        invoices,
        total,
        page,
        totalPages
      },
      message: `Found **${invoices.length}** invoice(s)${total ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
