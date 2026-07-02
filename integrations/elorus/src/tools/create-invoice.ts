import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  title: z.string().describe('Title/name of the line item.'),
  description: z.string().optional().describe('Line item description.'),
  quantity: z
    .string()
    .optional()
    .describe('Quantity (as string, e.g. "1", "2.5"). Defaults to "1".'),
  unitTotal: z
    .string()
    .optional()
    .describe('Unit price including tax. Used when calculatorMode is "total".'),
  unitValue: z
    .string()
    .optional()
    .describe('Unit price excluding tax. Used when calculatorMode is "initial".'),
  unit: z.string().optional().describe('Unit of measurement (e.g. "hrs", "pcs").'),
  productId: z
    .string()
    .optional()
    .describe(
      'Optional product/service ID. Auto-fills title, description, unit, and value from the product.'
    ),
  taxes: z
    .array(z.string())
    .optional()
    .describe('Array of tax IDs to apply to this line item.')
});

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in Elorus. Specify a client, document type, line items, and optional settings like currency, draft status, and taxes. Use calculatorMode "total" with unitTotal for tax-inclusive pricing, or "initial" with unitValue for tax-exclusive pricing.`,
  instructions: [
    'You must provide at least one line item.',
    'Use "total" calculatorMode with unitTotal for tax-inclusive amounts, or "initial" with unitValue for tax-exclusive amounts.',
    'Set draft to true to create as draft, or false to issue immediately.'
  ]
})
  .input(
    z.object({
      clientId: z.string().describe('Contact ID of the client being invoiced.'),
      documentTypeId: z
        .string()
        .describe('Document type ID (determines numbering and format).'),
      date: z
        .string()
        .optional()
        .describe('Invoice date in YYYY-MM-DD format. Defaults to today.'),
      dueDate: z.string().optional().describe('Payment due date in YYYY-MM-DD format.'),
      draft: z
        .boolean()
        .optional()
        .describe(
          'Whether to create as draft (true) or issue immediately (false). Defaults to true.'
        ),
      calculatorMode: z
        .enum(['total', 'initial'])
        .optional()
        .describe(
          '"total" = unitTotal is tax-inclusive; "initial" = unitValue is tax-exclusive. Defaults to "total".'
        ),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code (e.g. "EUR", "USD"). Defaults to client currency.'),
      exchangeRate: z.string().optional().describe('Exchange rate relative to base currency.'),
      items: z.array(lineItemSchema).describe('Line items for the invoice.'),
      paidOnReceipt: z
        .string()
        .optional()
        .describe('Amount paid immediately upon receipt (as string).'),
      paymentMethod: z
        .string()
        .optional()
        .describe(
          'Payment method code: "1"=domestic bank, "2"=foreign bank, "3"=cash, "4"=cheque, "6"=web banking, "7"=POS.'
        ),
      reference: z.string().optional().describe('Reference or PO number.'),
      customId: z.string().optional().describe('Custom external identifier (API-only).')
    })
  )
  .output(
    z.object({
      invoice: z.any().describe('The newly created invoice object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {
      client: ctx.input.clientId,
      documenttype: ctx.input.documentTypeId,
      calculator_mode: ctx.input.calculatorMode || 'total',
      items: ctx.input.items.map(item => {
        let lineItem: any = { title: item.title };
        if (item.description) lineItem.description = item.description;
        if (item.quantity) lineItem.quantity = item.quantity;
        if (item.unitTotal) lineItem.unit_total = item.unitTotal;
        if (item.unitValue) lineItem.unit_value = item.unitValue;
        if (item.unit) lineItem.unit = item.unit;
        if (item.productId) lineItem.product = item.productId;
        if (item.taxes) lineItem.taxes = item.taxes;
        return lineItem;
      })
    };

    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.dueDate) body.due_date = ctx.input.dueDate;
    if (ctx.input.draft !== undefined) body.draft = ctx.input.draft;
    if (ctx.input.currencyCode) body.currency_code = ctx.input.currencyCode;
    if (ctx.input.exchangeRate) body.exchange_rate = ctx.input.exchangeRate;
    if (ctx.input.paidOnReceipt) body.paid_on_receipt = ctx.input.paidOnReceipt;
    if (ctx.input.paymentMethod) body.payment_method = ctx.input.paymentMethod;
    if (ctx.input.reference) body.reference = ctx.input.reference;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let invoice = await client.createInvoice(body);

    return {
      output: { invoice },
      message: `Created invoice **${invoice.sequence_flat || invoice.id}** — Total: ${invoice.total} ${invoice.currency_code || ''}`
    };
  })
  .build();
