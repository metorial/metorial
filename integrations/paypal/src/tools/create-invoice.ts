import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { paypalServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create and optionally send a PayPal invoice. Define line items, recipient email, and invoice details. The invoice is created as a draft and can be automatically sent.`,
  instructions: [
    'Provide at least one line item with name, quantity, and unit amount.',
    'Set **sendImmediately** to true to send the invoice right after creation.',
    'Invoice numbers are auto-generated if not provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      currencyCode: z.string().describe('Three-character ISO-4217 currency code (e.g. USD)'),
      recipientEmail: z.string().describe('Email address of the invoice recipient'),
      items: z
        .array(
          z.object({
            name: z.string().describe('Item name'),
            quantity: z.string().describe('Quantity as a string (e.g. "1")'),
            unitAmount: z.string().describe('Unit price as a string (e.g. "100.00")'),
            description: z.string().optional().describe('Item description'),
            unitOfMeasure: z
              .string()
              .optional()
              .describe('Unit of measure (e.g. QUANTITY, HOURS, AMOUNT)')
          })
        )
        .min(1)
        .describe('Line items for the invoice'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Custom invoice number. Auto-generated if not provided.'),
      invoiceDate: z.string().optional().describe('Invoice date in YYYY-MM-DD format'),
      note: z.string().optional().describe('Note to the recipient'),
      memo: z.string().optional().describe('Private memo (not visible to recipient)'),
      dueDate: z.string().optional().describe('Payment due date in YYYY-MM-DD format'),
      sendImmediately: z
        .boolean()
        .optional()
        .describe('Whether to send the invoice immediately after creation')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('PayPal invoice ID'),
      status: z.string().optional().describe('Invoice status'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      selfLink: z.string().optional().describe('Link to the invoice resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let detail: Record<string, any> = {
      currency_code: ctx.input.currencyCode
    };
    if (ctx.input.invoiceNumber) detail.invoice_number = ctx.input.invoiceNumber;
    if (ctx.input.invoiceDate) detail.invoice_date = ctx.input.invoiceDate;
    if (ctx.input.note) detail.note = ctx.input.note;
    if (ctx.input.memo) detail.memo = ctx.input.memo;
    if (ctx.input.dueDate) {
      detail.payment_term = { due_date: ctx.input.dueDate };
    }

    let items = ctx.input.items.map(item => {
      let i: Record<string, any> = {
        name: item.name,
        quantity: item.quantity,
        unit_amount: { currency_code: ctx.input.currencyCode, value: item.unitAmount }
      };
      if (item.description) i.description = item.description;
      if (item.unitOfMeasure) i.unit_of_measure = item.unitOfMeasure;
      return i;
    });

    let invoice = await client.createInvoice({
      detail: detail as any,
      primaryRecipients: [
        {
          billing_info: { email_address: ctx.input.recipientEmail }
        }
      ],
      items: items as any
    });

    // Extract invoice ID from the href
    let selfLink = (invoice.href || '') as string;
    let invoiceId = selfLink.split('/').pop() || '';

    if (!invoiceId) {
      throw paypalServiceError('PayPal did not return an invoice ID for the created invoice');
    }

    // Fetch the created invoice so downstream tools get a stable ID and current status.
    let status = 'DRAFT';
    let invoiceNumber = ctx.input.invoiceNumber;

    let fullInvoice = await client.getInvoice(invoiceId);
    status = fullInvoice.status || 'DRAFT';
    invoiceNumber = fullInvoice.detail?.invoice_number;

    if (ctx.input.sendImmediately) {
      await client.sendInvoice(invoiceId);
      status = 'SENT';
    }

    return {
      output: {
        invoiceId,
        status,
        invoiceNumber,
        selfLink
      },
      message: `Invoice \`${invoiceId}\` created${ctx.input.sendImmediately ? ' and sent' : ''} for ${ctx.input.recipientEmail}. Status: **${status}**.`
    };
  })
  .build();
