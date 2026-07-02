import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  lineItemId: z.string(),
  description: z.string().nullable(),
  amount: z.string().nullable(),
  price: z.string().nullable(),
  taxRateId: z.string().nullable(),
  ledgerAccountId: z.string().nullable(),
  productId: z.string().nullable(),
  period: z.string().nullable(),
  rowOrder: z.number().nullable(),
  totalPriceExclTax: z.string().nullable(),
  totalPriceInclTax: z.string().nullable()
});

let paymentSchema = z.object({
  paymentId: z.string(),
  paymentDate: z.string().nullable(),
  price: z.string().nullable(),
  financialMutationId: z.string().nullable()
});

export let getSalesInvoice = SlateTool.create(spec, {
  name: 'Get Sales Invoice',
  key: 'get_sales_invoice',
  description: `Retrieve full details of a sales invoice including line items, payments, and status. Look up by Moneybird ID or human-readable invoice number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      salesInvoiceId: z.string().optional().describe('Moneybird internal invoice ID'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Human-readable invoice number (e.g., "2024-001")')
    })
  )
  .output(
    z.object({
      salesInvoiceId: z.string(),
      invoiceNumber: z.string().nullable(),
      reference: z.string().nullable(),
      state: z.string(),
      contactId: z.string().nullable(),
      contactName: z.string().nullable(),
      invoiceDate: z.string().nullable(),
      dueDate: z.string().nullable(),
      currency: z.string().nullable(),
      language: z.string().nullable(),
      pricesAreInclTax: z.boolean(),
      totalPriceExclTax: z.string().nullable(),
      totalPriceInclTax: z.string().nullable(),
      totalPaid: z.string().nullable(),
      totalUnpaid: z.string().nullable(),
      paidAt: z.string().nullable(),
      sentAt: z.string().nullable(),
      paused: z.boolean(),
      paymentUrl: z.string().nullable(),
      url: z.string().nullable(),
      lineItems: z.array(lineItemSchema),
      payments: z.array(paymentSchema),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let invoice: any;
    if (ctx.input.invoiceNumber) {
      invoice = await client.findSalesInvoiceByInvoiceId(ctx.input.invoiceNumber);
    } else if (ctx.input.salesInvoiceId) {
      invoice = await client.getSalesInvoice(ctx.input.salesInvoiceId);
    } else {
      throw new Error('Either salesInvoiceId or invoiceNumber must be provided');
    }

    let contactName =
      invoice.contact?.company_name ||
      `${invoice.contact?.firstname || ''} ${invoice.contact?.lastname || ''}`.trim() ||
      null;

    return {
      output: {
        salesInvoiceId: String(invoice.id),
        invoiceNumber: invoice.invoice_id || null,
        reference: invoice.reference || null,
        state: invoice.state || 'unknown',
        contactId: invoice.contact_id ? String(invoice.contact_id) : null,
        contactName,
        invoiceDate: invoice.invoice_date || null,
        dueDate: invoice.due_date || null,
        currency: invoice.currency || null,
        language: invoice.language || null,
        pricesAreInclTax: invoice.prices_are_incl_tax || false,
        totalPriceExclTax: invoice.total_price_excl_tax || null,
        totalPriceInclTax: invoice.total_price_incl_tax || null,
        totalPaid: invoice.total_paid || null,
        totalUnpaid: invoice.total_unpaid || null,
        paidAt: invoice.paid_at || null,
        sentAt: invoice.sent_at || null,
        paused: invoice.paused || false,
        paymentUrl: invoice.payment_url || null,
        url: invoice.url || null,
        lineItems: (invoice.details || []).map((d: any) => ({
          lineItemId: String(d.id),
          description: d.description || null,
          amount: d.amount || null,
          price: d.price || null,
          taxRateId: d.tax_rate_id ? String(d.tax_rate_id) : null,
          ledgerAccountId: d.ledger_account_id ? String(d.ledger_account_id) : null,
          productId: d.product_id ? String(d.product_id) : null,
          period: d.period || null,
          rowOrder: d.row_order ?? null,
          totalPriceExclTax: d.total_price_excl_tax_with_discount || null,
          totalPriceInclTax: d.total_price_incl_tax_with_discount || null
        })),
        payments: (invoice.payments || []).map((p: any) => ({
          paymentId: String(p.id),
          paymentDate: p.payment_date || null,
          price: p.price || null,
          financialMutationId: p.financial_mutation_id ? String(p.financial_mutation_id) : null
        })),
        createdAt: invoice.created_at || null,
        updatedAt: invoice.updated_at || null
      },
      message: `Retrieved invoice **${invoice.invoice_id || invoice.id}** (state: ${invoice.state}, total: ${invoice.total_price_incl_tax} ${invoice.currency || ''}).`
    };
  });
