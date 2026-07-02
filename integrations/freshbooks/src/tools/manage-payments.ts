import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let managePayments = SlateTool.create(spec, {
  name: 'Manage Payments',
  key: 'manage_payments',
  description: `Record, update, or delete payments against invoices in FreshBooks. Use this to track payments received from clients. Payments are linked to a specific invoice.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      paymentId: z.number().optional().describe('Payment ID (required for update/delete)'),
      invoiceId: z
        .number()
        .optional()
        .describe('Invoice ID to apply payment to (required for create)'),
      amount: z.string().optional().describe('Payment amount (e.g. "100.00")'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      paymentType: z
        .string()
        .optional()
        .describe(
          'Payment method (e.g. "Check", "Credit", "Cash", "Bank Transfer", "Credit Card")'
        ),
      note: z.string().optional().describe('Payment reference or note')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('Payment ID'),
      invoiceId: z.number().nullable().optional(),
      clientId: z.number().nullable().optional(),
      amount: z.any().optional(),
      date: z.string().nullable().optional(),
      paymentType: z.string().nullable().optional(),
      note: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.invoiceId !== undefined) payload.invoiceid = ctx.input.invoiceId;
      if (ctx.input.amount !== undefined) payload.amount = { amount: ctx.input.amount };
      if (ctx.input.date !== undefined) payload.date = ctx.input.date;
      if (ctx.input.paymentType !== undefined) payload.type = ctx.input.paymentType;
      if (ctx.input.note !== undefined) payload.note = ctx.input.note;
      return payload;
    };

    let mapResult = (raw: any) => ({
      paymentId: raw.id || raw.paymentid,
      invoiceId: raw.invoiceid,
      clientId: raw.clientid,
      amount: raw.amount,
      date: raw.date,
      paymentType: raw.type,
      note: raw.note
    });

    if (ctx.input.action === 'create') {
      let result = await client.createPayment(buildPayload());
      return {
        output: mapResult(result),
        message: `Recorded payment of **${ctx.input.amount}** (ID: ${result.id || result.paymentid}) against invoice ${result.invoiceid}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.paymentId) throw new Error('paymentId is required for update');
      let result = await client.updatePayment(ctx.input.paymentId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated payment (ID: ${ctx.input.paymentId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.paymentId) throw new Error('paymentId is required for delete');
      let result = await client.deletePayment(ctx.input.paymentId);
      return {
        output: mapResult(result),
        message: `Deleted payment (ID: ${ctx.input.paymentId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
