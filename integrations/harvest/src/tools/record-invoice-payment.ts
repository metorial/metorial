import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let recordInvoicePayment = SlateTool.create(spec, {
  name: 'Record Invoice Payment',
  key: 'record_invoice_payment',
  description: `Record a payment against an invoice in Harvest. Optionally specify the payment date and add notes. Call list_accounts to discover account IDs when choosing between multiple accounts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: harvestAccountIdSchema,
      invoiceId: z.number().describe('ID of the invoice to record payment for'),
      amount: z.number().describe('Payment amount'),
      paidAt: z.string().optional().describe('Payment timestamp (ISO 8601)'),
      paidDate: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Payment notes')
    })
  )
  .output(
    z.object({
      paymentId: z.number().describe('ID of the payment'),
      invoiceId: z.number().describe('Invoice ID'),
      amount: z.number().describe('Payment amount'),
      paidAt: z.string().optional().describe('Payment timestamp'),
      paidDate: z.string().optional().describe('Payment date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: resolveHarvestAccountId(ctx)
    });

    if (ctx.input.paidAt !== undefined && ctx.input.paidDate !== undefined) {
      throw createApiServiceError('Provide either paidAt or paidDate, not both.');
    }

    let payment = await client.createInvoicePayment(ctx.input.invoiceId, {
      amount: ctx.input.amount,
      paidAt: ctx.input.paidAt,
      paidDate: ctx.input.paidDate,
      notes: ctx.input.notes
    });

    return {
      output: {
        paymentId: payment.id,
        invoiceId: ctx.input.invoiceId,
        amount: payment.amount,
        paidAt: payment.paid_at,
        paidDate: payment.paid_date
      },
      message: `Recorded payment of **${payment.amount}** on invoice **#${ctx.input.invoiceId}**.`
    };
  })
  .build();
