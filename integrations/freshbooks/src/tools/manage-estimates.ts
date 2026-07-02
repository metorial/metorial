import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  name: z.string().describe('Line item description'),
  qty: z.number().describe('Quantity'),
  unitCost: z.string().describe('Unit cost amount (e.g. "100.00")'),
  taxName1: z.string().optional().describe('First tax name'),
  taxAmount1: z.string().optional().describe('First tax percentage'),
  taxName2: z.string().optional().describe('Second tax name'),
  taxAmount2: z.string().optional().describe('Second tax percentage')
});

export let manageEstimates = SlateTool.create(spec, {
  name: 'Manage Estimates',
  key: 'manage_estimates',
  description: `Create, update, delete, or send estimates in FreshBooks. Estimates allow clients to review and agree on price and scope before work begins. Use the "send" action to email estimates to clients.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'send']).describe('Action to perform'),
      estimateId: z
        .number()
        .optional()
        .describe('Estimate ID (required for update/delete/send)'),
      customerId: z.number().optional().describe('Client ID (required for create)'),
      createDate: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      currencyCode: z.string().optional().describe('Three-letter currency code'),
      estimateNumber: z.string().optional().describe('Custom estimate number'),
      poNumber: z.string().optional().describe('Purchase order number'),
      discountValue: z.string().optional().describe('Discount percentage (0-100)'),
      terms: z.string().optional().describe('Terms text'),
      notes: z.string().optional().describe('Additional notes'),
      lines: z.array(lineItemSchema).optional().describe('Line items'),
      emailRecipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses for sending (required for "send" action)')
    })
  )
  .output(
    z.object({
      estimateId: z.number(),
      estimateNumber: z.string().nullable().optional(),
      customerId: z.number().nullable().optional(),
      status: z.number().nullable().optional(),
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
      if (ctx.input.estimateNumber !== undefined)
        payload.estimate_number = ctx.input.estimateNumber;
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
      estimateId: raw.id || raw.estimateid,
      estimateNumber: raw.estimate_number,
      customerId: raw.customerid,
      status: raw.status,
      amount: raw.amount,
      currencyCode: raw.currency_code,
      createDate: raw.create_date
    });

    if (ctx.input.action === 'create') {
      let result = await fbClient.createEstimate(buildPayload());
      return {
        output: mapResult(result),
        message: `Created estimate **#${result.estimate_number}** (ID: ${result.id || result.estimateid}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.estimateId) throw new Error('estimateId is required for update');
      let result = await fbClient.updateEstimate(ctx.input.estimateId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated estimate **#${result.estimate_number}** (ID: ${ctx.input.estimateId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.estimateId) throw new Error('estimateId is required for delete');
      let result = await fbClient.deleteEstimate(ctx.input.estimateId);
      return {
        output: mapResult(result),
        message: `Archived estimate (ID: ${ctx.input.estimateId}).`
      };
    }

    if (ctx.input.action === 'send') {
      if (!ctx.input.estimateId) throw new Error('estimateId is required for send');
      if (!ctx.input.emailRecipients?.length)
        throw new Error('emailRecipients are required for send action');
      let result = await fbClient.sendEstimateByEmail(
        ctx.input.estimateId,
        ctx.input.emailRecipients
      );
      return {
        output: mapResult(result),
        message: `Sent estimate **#${result.estimate_number}** to ${ctx.input.emailRecipients.join(', ')}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
