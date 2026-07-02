import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  lineItemId: z.string().optional(),
  itemId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  rate: z.number().optional(),
  itemTotal: z.number().optional(),
  taxId: z.string().optional(),
  taxName: z.string().optional(),
  taxPercentage: z.number().optional(),
  discount: z.number().optional()
});

export let getInvoiceTool = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve full details of a specific invoice including line items, taxes, payment history, and customer information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to retrieve')
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string().optional(),
      customerId: z.string().optional(),
      customerName: z.string().optional(),
      status: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      referenceNumber: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
      subTotal: z.number().optional(),
      taxTotal: z.number().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      discount: z.number().optional(),
      discountType: z.string().optional(),
      currencyCode: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      paymentTerms: z.number().optional(),
      paymentTermsLabel: z.string().optional(),
      createdTime: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let resp = await client.getInvoice(ctx.input.invoiceId);
    let inv = resp.invoice;

    let lineItems = (inv.line_items || []).map((li: any) => ({
      lineItemId: li.line_item_id,
      itemId: li.item_id,
      name: li.name,
      description: li.description,
      quantity: li.quantity,
      rate: li.rate,
      itemTotal: li.item_total,
      taxId: li.tax_id,
      taxName: li.tax_name,
      taxPercentage: li.tax_percentage,
      discount: li.discount
    }));

    let output = {
      invoiceId: inv.invoice_id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      status: inv.status,
      date: inv.date,
      dueDate: inv.due_date,
      referenceNumber: inv.reference_number,
      lineItems,
      subTotal: inv.sub_total,
      taxTotal: inv.tax_total,
      total: inv.total,
      balance: inv.balance,
      discount: inv.discount,
      discountType: inv.discount_type,
      currencyCode: inv.currency_code,
      notes: inv.notes,
      terms: inv.terms,
      paymentTerms: inv.payment_terms,
      paymentTermsLabel: inv.payment_terms_label,
      createdTime: inv.created_time,
      lastModifiedTime: inv.last_modified_time
    };

    return {
      output,
      message: `Retrieved invoice **${inv.invoice_number}** for **${inv.customer_name}** — Status: ${inv.status}, Total: ${inv.currency_code} ${inv.total}.`
    };
  })
  .build();
