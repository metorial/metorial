import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

let creditNoteLineSchema = z.object({
  name: z.string().describe('Line item description'),
  qty: z.number().describe('Quantity'),
  unitCost: z.string().describe('Unit cost amount (e.g. "100.00")'),
  taxName1: z.string().optional().describe('First tax name'),
  taxAmount1: z.string().optional().describe('First tax percentage'),
  taxName2: z.string().optional().describe('Second tax name'),
  taxAmount2: z.string().optional().describe('Second tax percentage')
});

export let manageCreditNotes = SlateTool.create(spec, {
  name: 'Manage Credit Notes',
  key: 'manage_credit_notes',
  description: `Create, update, or delete credit notes in FreshBooks. Credit notes are used for client refunds or adjustments and can include line items similar to invoices.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      creditNoteId: z
        .number()
        .optional()
        .describe('Credit note ID (required for update/delete)'),
      customerId: z.number().optional().describe('Client ID (required for create)'),
      createDate: z.string().optional().describe('Credit note date (YYYY-MM-DD)'),
      currencyCode: z.string().optional().describe('Three-letter currency code'),
      notes: z.string().optional().describe('Additional notes'),
      lines: z.array(creditNoteLineSchema).optional().describe('Line items')
    })
  )
  .output(
    z.object({
      creditNoteId: z.number(),
      creditNumber: z.string().nullable().optional(),
      customerId: z.number().nullable().optional(),
      status: z.string().nullable().optional(),
      amount: z.any().optional(),
      currencyCode: z.string().nullable().optional(),
      createDate: z.string().nullable().optional()
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
      if (ctx.input.currencyCode !== undefined) payload.currency_code = ctx.input.currencyCode;
      if (ctx.input.notes !== undefined) payload.notes = ctx.input.notes;
      if (ctx.input.lines) {
        payload.lines = ctx.input.lines.map(line => {
          let l: Record<string, any> = {
            name: line.name,
            qty: line.qty,
            unit_cost: { amount: line.unitCost, code: ctx.input.currencyCode || 'USD' }
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
      creditNoteId: raw.id || raw.credit_id,
      creditNumber: raw.credit_number,
      customerId: raw.customerid,
      status: raw.status,
      amount: raw.amount,
      currencyCode: raw.currency_code,
      createDate: raw.create_date
    });

    if (ctx.input.action === 'create') {
      let result = await fbClient.createCreditNote(buildPayload());
      return {
        output: mapResult(result),
        message: `Created credit note (ID: ${result.id || result.credit_id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.creditNoteId) throw new Error('creditNoteId is required for update');
      let result = await fbClient.updateCreditNote(ctx.input.creditNoteId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated credit note (ID: ${ctx.input.creditNoteId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.creditNoteId) throw new Error('creditNoteId is required for delete');
      let result = await fbClient.deleteCreditNote(ctx.input.creditNoteId);
      return {
        output: mapResult(result),
        message: `Archived credit note (ID: ${ctx.input.creditNoteId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
