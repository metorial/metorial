import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  taxExcludedPrice: z
    .number()
    .optional()
    .describe('Unit price excluding tax; takes precedence over unitPrice'),
  taxIncludedPrice: z.number().optional().describe('Unit price including tax'),
  productId: z.number().optional(),
  productInternalId: z.string().optional(),
  classificationId: z
    .number()
    .optional()
    .describe('Classification ID from get_settings when not using a product'),
  discountType: z
    .enum(['Percent', 'Fixed'])
    .optional()
    .describe('How numeric discount is interpreted; defaults to Percent'),
  description: z.string().optional().describe('Line item description'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.number().optional().describe('Unit price (tax excluded)'),
  vatId: z
    .number()
    .optional()
    .describe('VAT rate ID (use Get Settings to find available VAT IDs)'),
  productNumber: z
    .string()
    .optional()
    .describe('Product number to reference an existing product'),
  discount: z.number().optional().describe('Discount on this line'),
  unit: z.string().optional().describe('Unit code from get_settings with includeUnits')
});

export let createSaleInvoice = SlateTool.create(spec, {
  name: 'Create Sale Invoice',
  key: 'create_sale_invoice',
  description: `Create a new sales invoice in Altoviz. The invoice is created in draft mode. Use the **Finalize Invoice** tool to finalize it, or the **Mark Invoice as Paid** tool to finalize and mark it as paid in one step.
Provide customer details and line items. Use the **Get Settings** tool to retrieve available VAT rates.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Altoviz customer ID'),
      customerNumber: z
        .string()
        .optional()
        .describe('Customer number (alternative to customerId)'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD), defaults to today'),
      internalId: z.string().optional().describe('Your custom internal ID'),
      headerNotes: z.string().optional().describe('Notes displayed at the top of the invoice'),
      footerNotes: z
        .string()
        .optional()
        .describe('Notes displayed at the bottom of the invoice'),
      lines: z.array(lineItemSchema).optional().describe('Invoice line items'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
      invoiceId: z.number().describe('Altoviz invoice ID'),
      number: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
      taxExcludedAmount: z.number().nullable().optional(),
      taxIncludedAmount: z.number().nullable().optional(),
      status: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSaleInvoice(ctx.input);

    return {
      output: {
        raw: result,
        invoiceId: result.id,
        number: result.number,
        date: result.date,
        taxExcludedAmount: result.taxExcludedAmount,
        taxIncludedAmount: result.taxIncludedAmount,
        status: result.status
      },
      message: `Created invoice **${result.number || result.id}**${typeof result.taxIncludedAmount === 'number' ? ` for **${result.taxIncludedAmount}** (tax included)` : ''}.`
    };
  })
  .build();
