import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { administrationIdSchema } from '../lib/schemas';
import { checkedOutput, exactId, nullableId, validateToolInput } from '../lib/validation';
import { spec } from '../spec';

let invoiceSummarySchema = z.object({
  invoiceId: z.string().describe('Moneybird internal ID'),
  invoiceNumber: z.string().nullable().describe('Human-readable invoice number'),
  reference: z.string().nullable().describe('Custom reference'),
  contactId: z.string().nullable().describe('Contact ID'),
  contactName: z.string().nullable().describe('Contact company or person name'),
  state: z.string().describe('Invoice state (draft, open, paid, late, etc.)'),
  invoiceDate: z.string().nullable().describe('Invoice date'),
  dueDate: z.string().nullable().describe('Due date'),
  currency: z.string().nullable().describe('Currency code'),
  totalPriceInclTax: z.string().nullable().describe('Total including tax'),
  totalUnpaid: z.string().nullable().describe('Total unpaid amount'),
  paused: z.boolean().describe('Whether the invoice workflow is paused')
});

const outputSchema = z.object({
  nextPage: z.number().int().positive().optional(),
  previousPage: z.number().int().positive().optional(),
  invoices: z.array(invoiceSummarySchema)
});

export let listSalesInvoices = SlateTool.create(spec, {
  name: 'List Sales Invoices',
  key: 'list_sales_invoices',
  description: `List and filter sales invoices in Moneybird. Filter by state (draft, open, paid, late, reminded, uncollectible), period, or contact. Supports pagination. Call list_administrations to choose administrationId when no default is saved.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      administrationId: administrationIdSchema,
      state: z
        .enum([
          'all',
          'draft',
          'open',
          'scheduled',
          'pending_payment',
          'late',
          'reminded',
          'paid',
          'uncollectible'
        ])
        .optional()
        .describe('Filter by invoice state'),
      period: z
        .string()
        .optional()
        .describe(
          'Filter by period: "this_month", "prev_month", "this_quarter", "this_year", "prev_year", or custom range "YYYYMMDD..YYYYMMDD"'
        ),
      contactId: z.string().optional().describe('Filter by contact ID'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (1-100)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('list_sales_invoices', ctx.input);
    return checkedOutput(outputSchema, async () => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.input.administrationId ?? ctx.config.administrationId
      });

      let filterParts: string[] = [];
      if (ctx.input.state) filterParts.push(`state:${ctx.input.state}`);
      if (ctx.input.period) filterParts.push(`period:${ctx.input.period}`);
      if (ctx.input.contactId) filterParts.push(`contact_id:${ctx.input.contactId}`);

      let invoices = await client.listSalesInvoices({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        filter: filterParts.length > 0 ? filterParts.join(',') : undefined
      });

      let mapped = invoices.map((inv: any) => ({
        invoiceId: exactId(inv.id),
        invoiceNumber: inv.invoice_id ?? null,
        reference: inv.reference ?? null,
        contactId: nullableId(inv.contact_id),
        contactName:
          inv.contact?.company_name ||
          `${inv.contact?.firstname || ''} ${inv.contact?.lastname || ''}`.trim() ||
          null,
        state: inv.state,
        invoiceDate: inv.invoice_date ?? null,
        dueDate: inv.due_date ?? null,
        currency: inv.currency ?? null,
        totalPriceInclTax: inv.total_price_incl_tax ?? null,
        totalUnpaid: inv.total_unpaid ?? null,
        paused: inv.paused
      }));

      return {
        output: {
          invoices: mapped,
          ...client.pagination
        },
        message: `Found ${mapped.length} invoice(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
      };
    });
  })
  .build();
