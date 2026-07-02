import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().optional().describe('ID of the item'),
  name: z.string().optional().describe('Name of the line item'),
  description: z.string().optional().describe('Description of the line item'),
  rate: z.number().optional().describe('Rate per unit of the line item'),
  quantity: z.number().optional().describe('Quantity of the line item'),
  amount: z.number().optional().describe('Total amount for the line item'),
  taxName: z.string().optional().describe('Name of the tax applied'),
  taxPercentage: z.number().optional().describe('Tax percentage applied to the line item')
});

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve full details of a specific invoice by its ID, including line items, customer information, totals, and payment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The ID of the invoice to retrieve')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Unique ID of the invoice'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      status: z
        .string()
        .optional()
        .describe('Current status of the invoice (e.g. draft, sent, paid, overdue)'),
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
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code of the invoice (e.g. USD, EUR)'),
      lineItems: z.array(lineItemSchema).optional().describe('Line items on the invoice'),
      notes: z.string().optional().describe('Customer-facing notes on the invoice'),
      terms: z.string().optional().describe('Terms and conditions on the invoice'),
      discount: z.number().optional().describe('Discount applied to the invoice'),
      discountType: z
        .string()
        .optional()
        .describe('Type of discount: "entity_level" or "item_level"'),
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

    let inv = await client.getInvoice(ctx.input.invoiceId);

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
      message: `Retrieved invoice **${inv.invoice_number}** for **${inv.customer_name}** — Status: ${inv.status}, Total: ${inv.currency_code} ${inv.total}, Balance: ${inv.currency_code} ${inv.balance}.`
    };
  })
  .build();
