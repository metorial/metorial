import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createInvoiceTool = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice for a customer. Include line items with quantities and rates, apply taxes and discounts, and set payment terms.`,
  instructions: [
    'At minimum, provide a customerId and at least one line item with a name and rate.',
    'Line items can reference existing items by itemId or be ad-hoc with just name, quantity, and rate.'
  ]
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to invoice'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Custom invoice number (auto-generated if omitted)'),
      referenceNumber: z.string().optional(),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD), defaults to today'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      paymentTerms: z.number().optional().describe('Payment terms in days'),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().optional().describe('ID of an existing item'),
            name: z.string().optional().describe('Item name (required if no itemId)'),
            description: z.string().optional(),
            quantity: z.number().optional().default(1),
            rate: z.number().optional().describe('Unit price'),
            taxId: z.string().optional(),
            discount: z
              .number()
              .optional()
              .describe('Discount percentage or amount per line item')
          })
        )
        .min(1)
        .describe('Line items for the invoice'),
      discount: z.number().optional().describe('Overall discount value'),
      discountType: z.enum(['entity_level', 'item_level']).optional(),
      isDiscountBeforeTax: z.boolean().optional(),
      notes: z.string().optional().describe('Customer-facing notes'),
      terms: z.string().optional().describe('Terms and conditions'),
      salespersonName: z.string().optional(),
      sendToCustomer: z
        .boolean()
        .optional()
        .default(false)
        .describe('Immediately email the invoice to the customer')
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      currencyCode: z.string().optional(),
      createdTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let lineItems = input.lineItems.map(li => ({
      item_id: li.itemId,
      name: li.name,
      description: li.description,
      quantity: li.quantity,
      rate: li.rate,
      tax_id: li.taxId,
      discount: li.discount
    }));

    let payload: Record<string, any> = {
      customer_id: input.customerId,
      line_items: lineItems
    };

    if (input.invoiceNumber) payload.invoice_number = input.invoiceNumber;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.date) payload.date = input.date;
    if (input.dueDate) payload.due_date = input.dueDate;
    if (input.paymentTerms !== undefined) payload.payment_terms = input.paymentTerms;
    if (input.discount !== undefined) payload.discount = input.discount;
    if (input.discountType) payload.discount_type = input.discountType;
    if (input.isDiscountBeforeTax !== undefined)
      payload.is_discount_before_tax = input.isDiscountBeforeTax;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;
    if (input.salespersonName) payload.salesperson_name = input.salespersonName;

    let resp = await client.createInvoice(payload);
    let inv = resp.invoice;

    if (input.sendToCustomer && inv.invoice_id) {
      await client.emailInvoice(inv.invoice_id, {});
    }

    return {
      output: {
        invoiceId: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        status: inv.status,
        total: inv.total,
        balance: inv.balance,
        currencyCode: inv.currency_code,
        createdTime: inv.created_time
      },
      message: `Created invoice **${inv.invoice_number}** for ${inv.currency_code} ${inv.total}.${input.sendToCustomer ? ' Invoice emailed to customer.' : ''}`
    };
  })
  .build();
