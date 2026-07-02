import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().describe('Item ID'),
  name: z.string().optional().describe('Item name override'),
  quantity: z.number().describe('Quantity'),
  rate: z.number().optional().describe('Rate per unit'),
  taxId: z.string().optional().describe('Tax ID'),
  description: z.string().optional().describe('Description')
});

export let manageCreditNote = SlateTool.create(spec, {
  name: 'Manage Credit Note',
  key: 'manage_credit_note',
  description: `Create or update a credit note, or apply a credit note to invoices. Credit notes represent amounts owed back to customers.
Use without a **creditNoteId** to create, or with one to update. Use **applyToInvoices** to apply credits.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      creditNoteId: z
        .string()
        .optional()
        .describe('Credit note ID to update or apply. Omit to create.'),
      customerId: z
        .string()
        .optional()
        .describe('Customer contact ID (required for creation)'),
      creditnoteNumber: z.string().optional().describe('Custom credit note number'),
      date: z.string().optional().describe('Credit note date (YYYY-MM-DD)'),
      referenceNumber: z.string().optional().describe('Reference number'),
      lineItems: z.array(lineItemSchema).optional().describe('Credit note line items'),
      notes: z.string().optional().describe('Notes'),
      applyToInvoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('Invoice ID'),
            amountApplied: z.number().describe('Amount to apply')
          })
        )
        .optional()
        .describe('Apply credit to specific invoices')
    })
  )
  .output(
    z.object({
      creditNoteId: z.string().describe('Credit note ID'),
      creditnoteNumber: z.string().optional().describe('Credit note number'),
      customerName: z.string().optional().describe('Customer name'),
      status: z.string().optional().describe('Credit note status'),
      total: z.number().optional().describe('Total amount'),
      balance: z.number().optional().describe('Remaining balance'),
      date: z.string().optional().describe('Credit note date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.creditNoteId && ctx.input.applyToInvoices) {
      await client.applyCreditToInvoice(ctx.input.creditNoteId, {
        invoices: ctx.input.applyToInvoices.map(inv => ({
          invoice_id: inv.invoiceId,
          amount_applied: inv.amountApplied
        }))
      });
      let result = await client.getCreditNote(ctx.input.creditNoteId);
      let cn = result.creditnote;
      return {
        output: {
          creditNoteId: String(cn.creditnote_id),
          creditnoteNumber: cn.creditnote_number ?? undefined,
          customerName: cn.customer_name ?? undefined,
          status: cn.status ?? undefined,
          total: cn.total ?? undefined,
          balance: cn.balance ?? undefined,
          date: cn.date ?? undefined
        },
        message: `Credit note **${cn.creditnote_number}** applied to ${ctx.input.applyToInvoices.length} invoice(s). Remaining balance: ${cn.balance}.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.customerId !== undefined) body.customer_id = ctx.input.customerId;
    if (ctx.input.creditnoteNumber !== undefined)
      body.creditnote_number = ctx.input.creditnoteNumber;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.referenceNumber !== undefined)
      body.reference_number = ctx.input.referenceNumber;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;

    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => {
        let item: Record<string, any> = { item_id: li.itemId, quantity: li.quantity };
        if (li.name !== undefined) item.name = li.name;
        if (li.rate !== undefined) item.rate = li.rate;
        if (li.taxId !== undefined) item.tax_id = li.taxId;
        if (li.description !== undefined) item.description = li.description;
        return item;
      });
    }

    let result: any;
    let action: string;

    if (ctx.input.creditNoteId) {
      result = await client.updateCreditNote(ctx.input.creditNoteId, body);
      action = 'updated';
    } else {
      result = await client.createCreditNote(body);
      action = 'created';
    }

    let cn = result.creditnote;

    return {
      output: {
        creditNoteId: String(cn.creditnote_id),
        creditnoteNumber: cn.creditnote_number ?? undefined,
        customerName: cn.customer_name ?? undefined,
        status: cn.status ?? undefined,
        total: cn.total ?? undefined,
        balance: cn.balance ?? undefined,
        date: cn.date ?? undefined
      },
      message: `Credit note **${cn.creditnote_number}** (${cn.creditnote_id}) ${action}. Total: ${cn.total}.`
    };
  })
  .build();
