import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateInvoiceTool = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice's details, line items, or status. Supports marking invoices as sent, void, or writing them off.`,
  instructions: [
    'Use statusAction to change the invoice lifecycle state (e.g. mark as sent, void, write off).',
    'To update line items, provide the full set of line items — partial updates are not supported by the API.'
  ]
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to update'),
      statusAction: z
        .enum(['mark_sent', 'mark_void', 'write_off', 'cancel_write_off'])
        .optional()
        .describe('Change the invoice status'),
      customerId: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      paymentTerms: z.number().optional(),
      lineItems: z
        .array(
          z.object({
            lineItemId: z.string().optional().describe('Existing line item ID (for updates)'),
            itemId: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().optional(),
            rate: z.number().optional(),
            taxId: z.string().optional(),
            discount: z.number().optional()
          })
        )
        .optional(),
      discount: z.number().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      referenceNumber: z.string().optional()
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      invoiceNumber: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;
    let invoiceId = input.invoiceId;

    if (input.statusAction) {
      if (input.statusAction === 'mark_sent') await client.markInvoiceSent(invoiceId);
      else if (input.statusAction === 'mark_void') await client.markInvoiceVoid(invoiceId);
      else if (input.statusAction === 'write_off') await client.writeOffInvoice(invoiceId);
      else if (input.statusAction === 'cancel_write_off')
        await client.cancelWriteOff(invoiceId);
    }

    let payload: Record<string, any> = {};
    if (input.customerId) payload.customer_id = input.customerId;
    if (input.date) payload.date = input.date;
    if (input.dueDate) payload.due_date = input.dueDate;
    if (input.paymentTerms !== undefined) payload.payment_terms = input.paymentTerms;
    if (input.discount !== undefined) payload.discount = input.discount;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.lineItems) {
      payload.line_items = input.lineItems.map(li => ({
        line_item_id: li.lineItemId,
        item_id: li.itemId,
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        rate: li.rate,
        tax_id: li.taxId,
        discount: li.discount
      }));
    }

    let inv: any;
    if (Object.keys(payload).length > 0) {
      let resp = await client.updateInvoice(invoiceId, payload);
      inv = resp.invoice;
    } else {
      let resp = await client.getInvoice(invoiceId);
      inv = resp.invoice;
    }

    return {
      output: {
        invoiceId: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        status: inv.status,
        total: inv.total,
        balance: inv.balance,
        lastModifiedTime: inv.last_modified_time
      },
      message: `Updated invoice **${inv.invoice_number}** — Status: ${inv.status}.${input.statusAction ? ` Applied action: ${input.statusAction}.` : ''}`
    };
  })
  .build();
