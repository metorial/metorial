import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  name: z.string().describe('Line item description'),
  qty: z.number().describe('Quantity'),
  unitCost: z.string().describe('Unit cost amount (e.g. "100.00")'),
  taxName1: z.string().optional().describe('First tax name (must match a configured tax)'),
  taxAmount1: z.string().optional().describe('First tax percentage'),
  taxName2: z.string().optional().describe('Second tax name (must match a configured tax)'),
  taxAmount2: z.string().optional().describe('Second tax percentage')
});

export let manageInvoices = SlateTool.create(spec, {
  name: 'Manage Invoices',
  key: 'manage_invoices',
  description: `Create, update, or delete invoices in FreshBooks. New invoices are created in **Draft** status. Use the "send" action to email invoices to clients, or "markAsSent" to mark them as sent without sending an email. Supports line items with taxes, discounts, terms, and notes.`,
  instructions: [
    'Invoices must be marked as sent or sent by email before they appear in accounting reports.',
    'The invoice_number is auto-generated if not provided.',
    'Currency code on line items should match the invoice currency.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'send', 'markAsSent'])
        .describe('Action to perform'),
      invoiceId: z
        .number()
        .optional()
        .describe('Invoice ID (required for update/delete/send/markAsSent)'),
      customerId: z.number().optional().describe('Client ID to invoice (required for create)'),
      createDate: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      dueOffsetDays: z.number().optional().describe('Number of days until payment is due'),
      currencyCode: z
        .string()
        .optional()
        .describe('Three-letter currency code (e.g. USD, CAD)'),
      invoiceNumber: z
        .string()
        .optional()
        .describe('Custom invoice number (auto-generated if omitted)'),
      poNumber: z.string().optional().describe('Purchase order number'),
      discountValue: z.string().optional().describe('Discount percentage (0-100)'),
      terms: z.string().optional().describe('Payment terms text'),
      notes: z.string().optional().describe('Additional notes'),
      lines: z.array(lineItemSchema).optional().describe('Line items for the invoice'),
      emailRecipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses for sending (required for "send" action)')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('Invoice ID'),
      invoiceNumber: z.string().nullable().optional().describe('Invoice number'),
      customerId: z.number().nullable().optional().describe('Client ID'),
      status: z.number().nullable().optional().describe('Invoice status code'),
      amount: z.any().optional().describe('Total amount'),
      outstandingAmount: z.any().optional().describe('Outstanding amount'),
      currencyCode: z.string().nullable().optional(),
      createDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let fbClient = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.customerId !== undefined) payload.customerid = ctx.input.customerId;
      if (ctx.input.createDate !== undefined) payload.create_date = ctx.input.createDate;
      if (ctx.input.dueOffsetDays !== undefined)
        payload.due_offset_days = ctx.input.dueOffsetDays;
      if (ctx.input.currencyCode !== undefined) payload.currency_code = ctx.input.currencyCode;
      if (ctx.input.invoiceNumber !== undefined)
        payload.invoice_number = ctx.input.invoiceNumber;
      if (ctx.input.poNumber !== undefined) payload.po_number = ctx.input.poNumber;
      if (ctx.input.discountValue !== undefined)
        payload.discount_value = ctx.input.discountValue;
      if (ctx.input.terms !== undefined) payload.terms = ctx.input.terms;
      if (ctx.input.notes !== undefined) payload.notes = ctx.input.notes;
      if (ctx.input.lines) {
        payload.lines = ctx.input.lines.map(line => {
          let l: Record<string, any> = {
            name: line.name,
            qty: line.qty,
            unit_cost: { amount: line.unitCost, code: ctx.input.currencyCode || 'USD' },
            type: 0
          };
          if (line.taxName1) l.taxName1 = line.taxName1;
          if (line.taxAmount1) l.taxAmount1 = line.taxAmount1;
          if (line.taxName2) l.taxName2 = line.taxName2;
          if (line.taxAmount2) l.taxAmount2 = line.taxAmount2;
          return l;
        });
      }
      return payload;
    };

    let mapResult = (raw: any) => ({
      invoiceId: raw.id || raw.invoiceid,
      invoiceNumber: raw.invoice_number,
      customerId: raw.customerid,
      status: raw.status,
      amount: raw.amount,
      outstandingAmount: raw.outstanding,
      currencyCode: raw.currency_code,
      createDate: raw.create_date,
      dueDate: raw.due_date
    });

    if (ctx.input.action === 'create') {
      let result = await fbClient.createInvoice(buildPayload());
      return {
        output: mapResult(result),
        message: `Created invoice **#${result.invoice_number}** (ID: ${result.id}) for client ${result.customerid} in draft status.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.invoiceId) throw new Error('invoiceId is required for update');
      let result = await fbClient.updateInvoice(ctx.input.invoiceId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated invoice **#${result.invoice_number}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.invoiceId) throw new Error('invoiceId is required for delete');
      let result = await fbClient.deleteInvoice(ctx.input.invoiceId);
      return {
        output: mapResult(result),
        message: `Archived invoice (ID: ${ctx.input.invoiceId}).`
      };
    }

    if (ctx.input.action === 'send') {
      if (!ctx.input.invoiceId) throw new Error('invoiceId is required for send');
      if (!ctx.input.emailRecipients?.length)
        throw new Error('emailRecipients are required for send action');
      let result = await fbClient.sendInvoiceByEmail(
        ctx.input.invoiceId,
        ctx.input.emailRecipients
      );
      return {
        output: mapResult(result),
        message: `Sent invoice **#${result.invoice_number}** to ${ctx.input.emailRecipients.join(', ')}.`
      };
    }

    if (ctx.input.action === 'markAsSent') {
      if (!ctx.input.invoiceId) throw new Error('invoiceId is required for markAsSent');
      let result = await fbClient.markInvoiceAsSent(ctx.input.invoiceId);
      return {
        output: mapResult(result),
        message: `Marked invoice **#${result.invoice_number}** as sent.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
