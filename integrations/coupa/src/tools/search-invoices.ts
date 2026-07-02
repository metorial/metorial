import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let invoiceSummarySchema = z.object({
  invoiceId: z.number().describe('Coupa internal invoice ID'),
  invoiceNumber: z.string().nullable().optional().describe('Invoice number'),
  status: z.string().nullable().optional().describe('Invoice status'),
  invoiceDate: z.string().nullable().optional().describe('Invoice date'),
  supplier: z.any().nullable().optional().describe('Supplier object'),
  currency: z.any().nullable().optional().describe('Currency object'),
  totalAmount: z.any().nullable().optional().describe('Total invoice amount'),
  lineCount: z.number().nullable().optional().describe('Number of invoice lines'),
  paymentTerm: z.any().nullable().optional().describe('Payment terms'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw invoice data')
});

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description: `Search and list invoices in Coupa. Filter by status, supplier, date range, export status, and other attributes. Supports PO-backed invoices, non-PO invoices, and credit notes.`,
  instructions: [
    'Common statuses: draft, pending_approval, approved, disputed, voided, paid.',
    'Use date filters like createdAfter/updatedAfter for incremental syncs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (e.g. "draft", "pending_approval", "approved", "disputed", "voided", "paid")'
        ),
      supplierId: z.number().optional().describe('Filter by supplier ID'),
      invoiceNumber: z.string().optional().describe('Filter by invoice number'),
      exportedFlag: z.boolean().optional().describe('Filter by exported status'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter invoices created after this date (ISO 8601)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter invoices updated after this date (ISO 8601)'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Coupa query filters'),
      orderBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results (default 50)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSummarySchema).describe('List of matching invoices'),
      count: z.number().describe('Number of invoices returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let filters: Record<string, string> = {};
    if (ctx.input.filters) {
      for (let [key, value] of Object.entries(ctx.input.filters)) {
        filters[key] = value;
      }
    }
    if (ctx.input.status) filters.status = ctx.input.status;
    if (ctx.input.supplierId) filters['supplier[id]'] = String(ctx.input.supplierId);
    if (ctx.input.invoiceNumber) filters['invoice-number'] = ctx.input.invoiceNumber;
    if (ctx.input.createdAfter) filters['created-at[gt]'] = ctx.input.createdAfter;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listInvoices({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      exportedFlag: ctx.input.exportedFlag
    });

    let invoices = (Array.isArray(results) ? results : []).map((inv: any) => ({
      invoiceId: inv.id,
      invoiceNumber: inv['invoice-number'] ?? inv.invoice_number ?? null,
      status: inv.status ?? null,
      invoiceDate: inv['invoice-date'] ?? inv.invoice_date ?? null,
      supplier: inv.supplier ?? null,
      currency: inv.currency ?? null,
      totalAmount: inv.total ?? inv.total ?? null,
      lineCount: inv['invoice-lines']
        ? inv['invoice-lines'].length
        : inv.invoice_lines
          ? inv.invoice_lines.length
          : null,
      paymentTerm: inv['payment-term'] ?? inv.payment_term ?? null,
      createdAt: inv['created-at'] ?? inv.created_at ?? null,
      updatedAt: inv['updated-at'] ?? inv.updated_at ?? null,
      rawData: inv
    }));

    return {
      output: {
        invoices,
        count: invoices.length
      },
      message: `Found **${invoices.length}** invoice(s).`
    };
  })
  .build();
