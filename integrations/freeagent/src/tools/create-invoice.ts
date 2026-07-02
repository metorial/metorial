import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

let invoiceItemSchema = z.object({
  itemType: z
    .enum([
      'Hours',
      'Days',
      'Weeks',
      'Months',
      'Years',
      'Products',
      'Services',
      'Training',
      'Expenses',
      'Comment',
      'Bills',
      'Discount',
      'Credit',
      'No Unit'
    ])
    .optional()
    .describe('Type of invoice item'),
  quantity: z.number().optional().describe('Quantity of items'),
  price: z.string().optional().describe('Price per unit'),
  description: z.string().optional().describe('Description for this line item'),
  category: z.string().optional().describe('Category URL or nominal code'),
  salesTaxRate: z.string().optional().describe('Sales tax rate percentage')
});

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new draft invoice in FreeAgent. Requires a contact ID and date. Optionally include line items, payment terms, and other invoice details. Invoices are always created in Draft status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to invoice'),
      datedOn: z.string().describe('Invoice date in YYYY-MM-DD format'),
      paymentTermsInDays: z.number().optional().describe('Payment terms in days'),
      reference: z.string().optional().describe('Invoice reference number'),
      projectId: z.string().optional().describe('Project ID to associate with'),
      currency: z.string().optional().describe('Currency code (e.g. GBP, USD)'),
      exchangeRate: z
        .string()
        .optional()
        .describe('Exchange rate for foreign currency invoices'),
      ecStatus: z
        .enum(['UK', 'EC Goods', 'EC VAT Moss', 'EC Services'])
        .optional()
        .describe('European Community status'),
      placeOfSupply: z.string().optional().describe('Place of supply for EC services'),
      comments: z.string().optional().describe('Comments to include on the invoice'),
      invoiceItems: z
        .array(invoiceItemSchema)
        .optional()
        .describe('Line items for the invoice')
    })
  )
  .output(
    z.object({
      invoice: z.record(z.string(), z.any()).describe('The newly created invoice')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let invoiceData: Record<string, any> = {
      contact: ctx.input.contactId,
      dated_on: ctx.input.datedOn
    };

    if (ctx.input.paymentTermsInDays !== undefined)
      invoiceData.payment_terms_in_days = ctx.input.paymentTermsInDays;
    if (ctx.input.reference) invoiceData.reference = ctx.input.reference;
    if (ctx.input.projectId) invoiceData.project = ctx.input.projectId;
    if (ctx.input.currency) invoiceData.currency = ctx.input.currency;
    if (ctx.input.exchangeRate) invoiceData.exchange_rate = ctx.input.exchangeRate;
    if (ctx.input.ecStatus) invoiceData.ec_status = ctx.input.ecStatus;
    if (ctx.input.placeOfSupply) invoiceData.place_of_supply = ctx.input.placeOfSupply;
    if (ctx.input.comments) invoiceData.comments = ctx.input.comments;

    if (ctx.input.invoiceItems && ctx.input.invoiceItems.length > 0) {
      invoiceData.invoice_items = ctx.input.invoiceItems.map(item => {
        let mapped: Record<string, any> = {};
        if (item.itemType) mapped.item_type = item.itemType;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.price) mapped.price = item.price;
        if (item.description) mapped.description = item.description;
        if (item.category) mapped.category = item.category;
        if (item.salesTaxRate) mapped.sales_tax_rate = item.salesTaxRate;
        return mapped;
      });
    }

    let invoice = await client.createInvoice(invoiceData);

    return {
      output: { invoice },
      message: `Created draft invoice **${invoice.reference || 'N/A'}** dated ${ctx.input.datedOn}`
    };
  })
  .build();
