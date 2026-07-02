import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invoiceSummarySchema = z.object({
  invoiceId: z.number().describe('Altoviz invoice ID'),
  number: z.string().nullable().optional().describe('Invoice number (e.g. FA001002)'),
  date: z.string().nullable().optional().describe('Invoice date (YYYY-MM-DD)'),
  customerNumber: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  taxExcludedAmount: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  taxIncludedAmount: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  internalId: z.string().nullable().optional()
});

export let listSaleInvoices = SlateTool.create(spec, {
  name: 'List Sale Invoices',
  key: 'list_sale_invoices',
  description: `List sales invoices from your Altoviz account. Filter by date range, customer, or status. Results can be sorted and may include canceled invoices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageIndex: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)'),
      dateFrom: z.string().optional().describe('Filter invoices from this date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter invoices up to this date (YYYY-MM-DD)'),
      customerId: z.number().optional().describe('Filter by Altoviz customer ID'),
      status: z.string().optional().describe('Filter by invoice status'),
      includeCanceled: z.boolean().optional().describe('Include canceled invoices in results'),
      sortBy: z.string().optional().describe('Field name to sort by'),
      sortDirection: z.string().optional().describe('Sort direction (asc or desc)')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let invoices = await client.listSaleInvoices({
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      customerId: ctx.input.customerId,
      status: ctx.input.status,
      includeCanceled: ctx.input.includeCanceled,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let mapped = invoices.map((inv: any) => ({
      invoiceId: inv.id,
      number: inv.number,
      date: inv.date,
      customerNumber: inv.customerNumber,
      customerName: inv.customerName,
      taxExcludedAmount: inv.taxExcludedAmount,
      taxAmount: inv.taxAmount,
      taxIncludedAmount: inv.taxIncludedAmount,
      status: inv.status,
      internalId: inv.internalId
    }));

    return {
      output: { invoices: mapped },
      message: `Found **${mapped.length}** invoice(s).`
    };
  })
  .build();
