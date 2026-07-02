import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeRestClient } from '../lib/client';
import { buildXml, parseXml } from '../lib/xml';
import { spec } from '../spec';

export let settleTransaction = SlateTool.create(spec, {
  name: 'Submit for Settlement',
  key: 'settle_transaction',
  description: `Submits an authorized Braintree transaction for settlement, optionally adjusting the amount. This captures the funds from a previously authorized transaction.
Supports both full and partial settlement.`,
  instructions: [
    'For partial settlement, provide an amount less than the original authorization.',
    'Only authorized transactions can be submitted for settlement.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Legacy transaction ID to submit for settlement'),
      amount: z
        .string()
        .optional()
        .describe('Settlement amount. Omit to settle the full authorized amount.')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      status: z.string().describe('Transaction status after submission'),
      amount: z.string().optional().describe('Settlement amount')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let body = '';
    if (ctx.input.amount) {
      body = buildXml('transaction', { amount: ctx.input.amount });
    }

    let xml = await rest.put(
      `/transactions/${ctx.input.transactionId}/submit_for_settlement`,
      body
    );
    let parsed = parseXml(xml);
    let txn = parsed.transaction || parsed;

    return {
      output: {
        transactionId: txn.id || ctx.input.transactionId,
        status: txn.status || 'submitted_for_settlement',
        amount: txn.amount
      },
      message: `Transaction \`${ctx.input.transactionId}\` submitted for settlement${ctx.input.amount ? ` (amount: ${ctx.input.amount})` : ''} — status: **${txn.status || 'submitted_for_settlement'}**`
    };
  })
  .build();
