import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let createSalesInvoice = SlateTool.create(spec, {
  name: 'Create Sales Invoice',
  key: 'create_sales_invoice',
  description: `Create a new sales invoice in Moneybird. Add line items with descriptions, amounts, and prices. The invoice is created as a draft by default. Use the "Send Sales Invoice" tool to send it.`,
  instructions: [
    'At minimum, provide a contactId and at least one line item.',
    'Prices can be either including or excluding tax, controlled by pricesAreInclTax.',
    'Use productId on line items to auto-fill description, price, tax rate, and ledger account from a product.'
  ]
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to invoice'),
      invoiceDate: z
        .string()
        .optional()
        .describe('Invoice date (YYYY-MM-DD). Defaults to today.'),
      dueDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
      currency: z.string().optional().describe('ISO currency code (e.g., EUR, USD)'),
      language: z.string().optional().describe('Language code (nl, en)'),
      reference: z.string().optional().describe('Custom reference'),
      discount: z.string().optional().describe('Discount percentage (e.g., "10")'),
      pricesAreInclTax: z
        .boolean()
        .optional()
        .describe('Whether prices include tax (default: true)'),
      workflowId: z.string().optional().describe('Workflow ID for sending configuration'),
      documentStyleId: z.string().optional().describe('Document style/template ID'),
      lineItems: z
        .array(
          z.object({
            description: z.string().optional().describe('Line item description'),
            amount: z.string().optional().describe('Quantity (e.g., "1", "2.5")'),
            price: z.string().optional().describe('Unit price'),
            taxRateId: z.string().optional().describe('Tax rate ID'),
            ledgerAccountId: z.string().optional().describe('Ledger account ID'),
            productId: z
              .string()
              .optional()
              .describe('Product ID (auto-fills description, price, tax rate)'),
            period: z
              .string()
              .optional()
              .describe('Period for the line item (e.g., "20240101..20240131")')
          })
        )
        .describe('Invoice line items')
    })
  )
  .output(
    z.object({
      salesInvoiceId: z.string(),
      invoiceNumber: z.string().nullable(),
      state: z.string(),
      totalPriceInclTax: z.string().nullable(),
      totalPriceExclTax: z.string().nullable(),
      url: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let invoiceData: Record<string, any> = {
      contact_id: ctx.input.contactId,
      details_attributes: ctx.input.lineItems.map((item, i) => {
        let detail: Record<string, any> = {};
        if (item.description) detail.description = item.description;
        if (item.amount) detail.amount = item.amount;
        if (item.price) detail.price = item.price;
        if (item.taxRateId) detail.tax_rate_id = item.taxRateId;
        if (item.ledgerAccountId) detail.ledger_account_id = item.ledgerAccountId;
        if (item.productId) detail.product_id = item.productId;
        if (item.period) detail.period = item.period;
        detail.row_order = i + 1;
        return detail;
      })
    };

    if (ctx.input.invoiceDate) invoiceData.invoice_date = ctx.input.invoiceDate;
    if (ctx.input.dueDate) invoiceData.due_date = ctx.input.dueDate;
    if (ctx.input.currency) invoiceData.currency = ctx.input.currency;
    if (ctx.input.language) invoiceData.language = ctx.input.language;
    if (ctx.input.reference) invoiceData.reference = ctx.input.reference;
    if (ctx.input.discount) invoiceData.discount = ctx.input.discount;
    if (ctx.input.pricesAreInclTax !== undefined)
      invoiceData.prices_are_incl_tax = ctx.input.pricesAreInclTax;
    if (ctx.input.workflowId) invoiceData.workflow_id = ctx.input.workflowId;
    if (ctx.input.documentStyleId) invoiceData.document_style_id = ctx.input.documentStyleId;

    let invoice = await client.createSalesInvoice(invoiceData);

    return {
      output: {
        salesInvoiceId: String(invoice.id),
        invoiceNumber: invoice.invoice_id || null,
        state: invoice.state || 'draft',
        totalPriceInclTax: invoice.total_price_incl_tax || null,
        totalPriceExclTax: invoice.total_price_excl_tax || null,
        url: invoice.url || null
      },
      message: `Created sales invoice **${invoice.invoice_id || invoice.id}** for ${invoice.total_price_incl_tax || '0.00'} ${invoice.currency || 'EUR'} (state: ${invoice.state}).`
    };
  });
