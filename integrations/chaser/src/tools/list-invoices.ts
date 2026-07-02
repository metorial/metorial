import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invoiceOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `List invoices in Chaser with optional filtering and pagination. Filter by invoice ID, number, status, currency, customer, amounts, and dates.`,
  instructions: [
    'Filters use operators like "[eq]", "[in]", "[gte]", "[lte]", etc. (e.g. `{ "status[eq]": "AUTHORISED", "amount_due[gte]": "1000" }`).',
    'Pagination starts at page 0, with a default limit of 100 results per page.'
  ],
  constraints: ['Maximum 100 results per page.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(0).describe('Page number (starts at 0)'),
      limit: z.number().optional().default(100).describe('Results per page (max 100)'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter parameters (e.g. { "status[eq]": "AUTHORISED", "customer_external_id[eq]": "CUST-001" })'
        )
    })
  )
  .output(
    z.object({
      pageNumber: z.number().describe('Current page number'),
      pageSize: z.number().describe('Results per page'),
      totalCount: z.number().describe('Total matching invoices'),
      invoices: z.array(invoiceOutputSchema).describe('List of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listInvoices({
      page: ctx.input.page,
      limit: ctx.input.limit,
      filters: ctx.input.filters
    });

    let invoices = result.data.map((inv: any) => ({
      invoiceInternalId: inv.id || '',
      invoiceId: inv.invoiceId || '',
      invoiceNumber: inv.invoiceNumber || '',
      status: inv.status || '',
      currencyCode: inv.currencyCode || '',
      amountDue: inv.amountDue ?? 0,
      amountPaid: inv.amountPaid ?? 0,
      total: inv.total ?? 0,
      subTotal: inv.subTotal ?? null,
      date: inv.date || '',
      dueDate: inv.dueDate || '',
      fullyPaidDate: inv.fullyPaidDate ?? null,
      customerExternalId: inv.customerExternalId || '',
      customerName: inv.customerName ?? null,
      payments: inv.payments,
      invoicePdfLink: inv.invoicePdfLink ?? null,
      invoicePdfLinkUpdatedAt: inv.invoicePdfLinkUpdatedAt ?? null
    }));

    return {
      output: {
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        invoices
      },
      message: `Found **${result.totalCount}** invoices (showing page ${result.pageNumber}, ${invoices.length} results).`
    };
  })
  .build();
