import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemInputSchema = z.object({
  itemId: z.string().optional().describe('ID of the item from the items catalog'),
  name: z.string().optional().describe('Name of the line item'),
  description: z.string().optional().describe('Description of the line item'),
  rate: z.number().optional().describe('Rate per unit of the line item'),
  quantity: z.number().optional().describe('Quantity of the line item'),
  taxName: z.string().optional().describe('Name of the tax to apply'),
  taxPercentage: z.number().optional().describe('Tax percentage to apply to the line item')
});

let lineItemOutputSchema = z.object({
  itemId: z.string().optional().describe('ID of the item'),
  name: z.string().optional().describe('Name of the line item'),
  description: z.string().optional().describe('Description of the line item'),
  rate: z.number().optional().describe('Rate per unit of the line item'),
  quantity: z.number().optional().describe('Quantity of the line item'),
  amount: z.number().optional().describe('Total amount for the line item'),
  taxName: z.string().optional().describe('Name of the tax applied'),
  taxPercentage: z.number().optional().describe('Tax percentage applied to the line item')
});

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice's details such as customer, dates, line items, discount, notes, terms, and currency settings.`,
  instructions: [
    'To update line items, provide the full set of line items — partial line item updates are not supported by the API.',
    'Only include fields that need to be changed; omitted fields will remain unchanged.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The ID of the invoice to update'),
      customerId: z
        .string()
        .optional()
        .describe('ID of the customer to associate with the invoice'),
      invoiceNumber: z.string().optional().describe('Custom invoice number'),
      date: z.string().optional().describe('Invoice date in yyyy-MM-dd format'),
      dueDate: z.string().optional().describe('Due date of the invoice in yyyy-MM-dd format'),
      discount: z.number().optional().describe('Discount value to apply to the invoice'),
      discountType: z
        .string()
        .optional()
        .describe('Type of discount: "entity_level" or "item_level"'),
      lineItems: z
        .array(lineItemInputSchema)
        .optional()
        .describe('Line items for the invoice (replaces all existing line items)'),
      notes: z.string().optional().describe('Customer-facing notes on the invoice'),
      terms: z.string().optional().describe('Terms and conditions on the invoice'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code for the invoice (e.g. USD, EUR)'),
      exchangeRate: z.number().optional().describe('Exchange rate for the currency'),
      templateId: z.string().optional().describe('ID of the invoice template to use')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Unique ID of the invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      status: z.string().optional().describe('Current status of the invoice'),
      customerId: z
        .string()
        .optional()
        .describe('ID of the customer associated with the invoice'),
      customerName: z
        .string()
        .optional()
        .describe('Name of the customer associated with the invoice'),
      date: z.string().optional().describe('Invoice date in yyyy-MM-dd format'),
      dueDate: z.string().optional().describe('Due date of the invoice in yyyy-MM-dd format'),
      total: z.number().optional().describe('Total amount of the invoice'),
      balance: z.number().optional().describe('Outstanding balance on the invoice'),
      currencyCode: z.string().optional().describe('Currency code of the invoice'),
      lineItems: z
        .array(lineItemOutputSchema)
        .optional()
        .describe('Line items on the invoice'),
      notes: z.string().optional().describe('Customer-facing notes on the invoice'),
      terms: z.string().optional().describe('Terms and conditions on the invoice'),
      discount: z.number().optional().describe('Discount applied to the invoice'),
      discountType: z.string().optional().describe('Type of discount applied'),
      shippingCharge: z.number().optional().describe('Shipping charge on the invoice'),
      adjustment: z.number().optional().describe('Adjustment amount on the invoice'),
      createdTime: z.string().optional().describe('Timestamp when the invoice was created'),
      lastModifiedTime: z
        .string()
        .optional()
        .describe('Timestamp when the invoice was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let input = ctx.input;
    let payload: Record<string, any> = {};

    if (input.customerId) payload.customer_id = input.customerId;
    if (input.invoiceNumber) payload.invoice_number = input.invoiceNumber;
    if (input.date) payload.date = input.date;
    if (input.dueDate) payload.due_date = input.dueDate;
    if (input.discount !== undefined) payload.discount = input.discount;
    if (input.discountType) payload.discount_type = input.discountType;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;
    if (input.currencyCode) payload.currency_code = input.currencyCode;
    if (input.exchangeRate !== undefined) payload.exchange_rate = input.exchangeRate;
    if (input.templateId) payload.template_id = input.templateId;

    if (input.lineItems) {
      payload.line_items = input.lineItems.map(li => ({
        item_id: li.itemId,
        name: li.name,
        description: li.description,
        rate: li.rate,
        quantity: li.quantity,
        tax_name: li.taxName,
        tax_percentage: li.taxPercentage
      }));
    }

    let inv = await client.updateInvoice(input.invoiceId, payload);

    let lineItems = (inv.line_items || []).map((li: any) => ({
      itemId: li.item_id,
      name: li.name,
      description: li.description,
      rate: li.rate,
      quantity: li.quantity,
      amount: li.item_total,
      taxName: li.tax_name,
      taxPercentage: li.tax_percentage
    }));

    let output = {
      invoiceId: inv.invoice_id,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      date: inv.date,
      dueDate: inv.due_date,
      total: inv.total,
      balance: inv.balance,
      currencyCode: inv.currency_code,
      lineItems,
      notes: inv.notes,
      terms: inv.terms,
      discount: inv.discount,
      discountType: inv.discount_type,
      shippingCharge: inv.shipping_charge,
      adjustment: inv.adjustment,
      createdTime: inv.created_time,
      lastModifiedTime: inv.last_modified_time
    };

    return {
      output,
      message: `Updated invoice **${inv.invoice_number}** for **${inv.customer_name}** — Status: ${inv.status}, Total: ${inv.currency_code} ${inv.total}.`
    };
  })
  .build();
