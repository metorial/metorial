import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

let payoutSchema = z.object({
  payoutId: z.string().describe('Payout ID'),
  state: z.string().optional().describe('Payout state'),
  paymentMethod: z.string().optional().describe('Payment method'),
  amount: z.string().optional().describe('Payout amount'),
  destination: z.string().optional().nullable().describe('Payout destination'),
  pullPaymentId: z.string().optional().nullable().describe('Associated pull payment ID'),
  createdDate: z.string().optional().describe('Creation date')
});

export let managePayouts = SlateTool.create(spec, {
  name: 'Manage Payouts',
  key: 'manage_payouts',
  description: `List, approve, cancel, or mark payouts as paid. Payouts represent claims against pull payments that need to be processed. Supports both on-chain and Lightning payouts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'approve', 'cancel', 'mark_paid']).describe('Action to perform'),
      storeId: z.string().describe('Store ID'),
      payoutId: z.string().optional().describe('Payout ID (for approve, cancel, mark_paid)'),
      includeCancelled: z
        .boolean()
        .optional()
        .describe('Include cancelled payouts (for list)'),
      paymentMethodId: z.string().optional().describe('Filter by payment method (for list)')
    })
  )
  .output(
    z.object({
      payout: payoutSchema.optional().describe('Payout details (for approve)'),
      payouts: z.array(payoutSchema).optional().describe('List of payouts'),
      cancelled: z.boolean().optional().describe('Whether the payout was cancelled'),
      markedPaid: z.boolean().optional().describe('Whether the payout was marked as paid')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let { action, storeId } = ctx.input;

    let mapPayout = (p: Record<string, unknown>) => ({
      payoutId: p.id as string,
      state: p.state as string | undefined,
      paymentMethod: p.paymentMethod as string | undefined,
      amount: p.amount as string | undefined,
      destination: p.destination as string | undefined,
      pullPaymentId: p.pullPaymentId as string | undefined,
      createdDate: p.date !== undefined ? String(p.date) : undefined
    });

    if (action === 'list') {
      let payouts = await client.getPayouts(storeId, {
        includeCancelled: ctx.input.includeCancelled,
        paymentMethodId: ctx.input.paymentMethodId
      });
      let mapped = payouts.map(mapPayout);
      return {
        output: { payouts: mapped },
        message: `Found **${mapped.length}** payout(s).`
      };
    }

    if (action === 'approve') {
      let payout = await client.approvePayout(storeId, ctx.input.payoutId!);
      return {
        output: { payout: mapPayout(payout) },
        message: `Approved payout **${ctx.input.payoutId}**.`
      };
    }

    if (action === 'cancel') {
      await client.cancelPayout(storeId, ctx.input.payoutId!);
      return {
        output: { cancelled: true },
        message: `Cancelled payout **${ctx.input.payoutId}**.`
      };
    }

    // mark_paid
    await client.markPayoutPaid(storeId, ctx.input.payoutId!);
    return {
      output: { markedPaid: true },
      message: `Marked payout **${ctx.input.payoutId}** as paid.`
    };
  })
  .build();
