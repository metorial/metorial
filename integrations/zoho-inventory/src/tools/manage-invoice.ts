import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().describe('Item ID'),
  name: z.string().optional().describe('Item name override'),
  quantity: z.number().describe('Quantity'),
  rate: z.number().optional().describe('Rate per unit'),
  discount: z.string().optional().describe('Discount (e.g., "10%" or "5.00")'),
  taxId: z.string().optional().describe('Tax ID'),
  description: z.string().optional().describe('Line item description')
});

export let manageInvoice = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description: `Create, update, or change the status of an invoice. Supports line items, discounts, shipping charges, and payment terms.
Use without an **invoiceId** to create, or with one to update. Use **action** to mark as sent, void, or email the invoice.`,
  instructions: [
    'To create, provide customerId and at least one lineItem.',
    'Use the action field to transition invoice status (mark_sent, void) or email it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z
        .string()
        .optional()
        .describe('ID of the invoice to update. Omit to create.'),
      customerId: z
        .string()
        .optional()
        .describe('Customer contact ID (required for creation)'),
      invoiceNumber: z.string().optional().describe('Custom invoice number'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional().describe('Reference number'),
      paymentTerms: z.number().optional().describe('Payment terms in days'),
      paymentTermsLabel: z
        .string()
        .optional()
        .describe('Payment terms label (e.g., "Net 30")'),
      lineItems: z.array(lineItemSchema).optional().describe('Line items for the invoice'),
      notes: z.string().optional().describe('Customer-facing notes'),
      terms: z.string().optional().describe('Terms and conditions'),
      discount: z.string().optional().describe('Invoice-level discount'),
      shippingCharge: z.number().optional().describe('Shipping charge'),
      adjustment: z.number().optional().describe('Adjustment amount'),
      adjustmentDescription: z.string().optional().describe('Description for adjustment'),
      salesorderId: z.string().optional().describe('Sales order ID to convert to invoice'),
      action: z
        .enum(['mark_sent', 'void', 'email'])
        .optional()
        .describe('Action to perform on existing invoice'),
      emailTo: z
        .array(z.string())
        .optional()
        .describe('Email addresses to send invoice to (when action is email)'),
      emailSubject: z.string().optional().describe('Email subject (when action is email)'),
      emailBody: z.string().optional().describe('Email body (when action is email)')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      customerName: z.string().optional().describe('Customer name'),
      status: z.string().optional().describe('Invoice status'),
      total: z.number().optional().describe('Total amount'),
      balanceDue: z.number().optional().describe('Balance due'),
      date: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Due date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.invoiceId && ctx.input.action) {
      if (ctx.input.action === 'mark_sent') {
        await client.markInvoiceSent(ctx.input.invoiceId);
      } else if (ctx.input.action === 'void') {
        await client.voidInvoice(ctx.input.invoiceId);
      } else if (ctx.input.action === 'email') {
        let emailData: Record<string, any> = {};
        if (ctx.input.emailTo) emailData.to_mail_ids = ctx.input.emailTo;
        if (ctx.input.emailSubject) emailData.subject = ctx.input.emailSubject;
        if (ctx.input.emailBody) emailData.body = ctx.input.emailBody;
        await client.emailInvoice(ctx.input.invoiceId, emailData);
      }

      let result = await client.getInvoice(ctx.input.invoiceId);
      let inv = result.invoice;
      return {
        output: {
          invoiceId: String(inv.invoice_id),
          invoiceNumber: inv.invoice_number ?? undefined,
          customerName: inv.customer_name ?? undefined,
          status: inv.status ?? undefined,
          total: inv.total ?? undefined,
          balanceDue: inv.balance ?? undefined,
          date: inv.date ?? undefined,
          dueDate: inv.due_date ?? undefined
        },
        message: `Invoice **${inv.invoice_number}** — action **${ctx.input.action}** completed.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.customerId !== undefined) body.customer_id = ctx.input.customerId;
    if (ctx.input.invoiceNumber !== undefined) body.invoice_number = ctx.input.invoiceNumber;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.dueDate !== undefined) body.due_date = ctx.input.dueDate;
    if (ctx.input.referenceNumber !== undefined)
      body.reference_number = ctx.input.referenceNumber;
    if (ctx.input.paymentTerms !== undefined) body.payment_terms = ctx.input.paymentTerms;
    if (ctx.input.paymentTermsLabel !== undefined)
      body.payment_terms_label = ctx.input.paymentTermsLabel;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.terms !== undefined) body.terms = ctx.input.terms;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;
    if (ctx.input.shippingCharge !== undefined)
      body.shipping_charge = ctx.input.shippingCharge;
    if (ctx.input.adjustment !== undefined) body.adjustment = ctx.input.adjustment;
    if (ctx.input.adjustmentDescription !== undefined)
      body.adjustment_description = ctx.input.adjustmentDescription;
    if (ctx.input.salesorderId !== undefined) body.salesorder_id = ctx.input.salesorderId;

    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => {
        let item: Record<string, any> = { item_id: li.itemId, quantity: li.quantity };
        if (li.name !== undefined) item.name = li.name;
        if (li.rate !== undefined) item.rate = li.rate;
        if (li.discount !== undefined) item.discount = li.discount;
        if (li.taxId !== undefined) item.tax_id = li.taxId;
        if (li.description !== undefined) item.description = li.description;
        return item;
      });
    }

    let result: any;
    let action: string;

    if (ctx.input.invoiceId) {
      result = await client.updateInvoice(ctx.input.invoiceId, body);
      action = 'updated';
    } else {
      result = await client.createInvoice(body);
      action = 'created';
    }

    let inv = result.invoice;

    return {
      output: {
        invoiceId: String(inv.invoice_id),
        invoiceNumber: inv.invoice_number ?? undefined,
        customerName: inv.customer_name ?? undefined,
        status: inv.status ?? undefined,
        total: inv.total ?? undefined,
        balanceDue: inv.balance ?? undefined,
        date: inv.date ?? undefined,
        dueDate: inv.due_date ?? undefined
      },
      message: `Invoice **${inv.invoice_number}** (${inv.invoice_id}) ${action} successfully. Total: ${inv.total}, balance due: ${inv.balance}.`
    };
  })
  .build();
