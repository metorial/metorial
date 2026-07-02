import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient } from '../lib/client';
import { REFUND_TRANSACTION, REVERSE_TRANSACTION } from '../lib/graphql-queries';
import { spec } from '../spec';

export let refundTransaction = SlateTool.create(spec, {
  name: 'Refund Transaction',
  key: 'refund_transaction',
  description: `Refunds or reverses a Braintree transaction. For settled transactions, issues a refund (full or partial). For unsettled transactions, can void/reverse the transaction instead.
Use "refund" for settled transactions and "reverse" to automatically void or refund based on status.`,
  instructions: [
    'Use mode "refund" for settled transactions. Provide an amount for partial refunds, or omit for a full refund.',
    'Use mode "reverse" to let Braintree decide whether to void or refund based on the transaction state.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transactionId: z
        .string()
        .describe('Braintree GraphQL transaction ID to refund or reverse'),
      mode: z
        .enum(['refund', 'reverse'])
        .default('refund')
        .describe('Whether to refund (for settled) or reverse (auto-decide void vs refund)'),
      amount: z
        .string()
        .optional()
        .describe('Amount to refund. Omit for full refund. Only applies to mode "refund".'),
      orderId: z.string().optional().describe('Order ID to associate with the refund')
    })
  )
  .output(
    z.object({
      refundId: z.string().optional().describe('GraphQL ID of the refund or reversal'),
      legacyId: z.string().optional().describe('Legacy ID of the refund'),
      status: z.string().describe('Status of the refund/reversal'),
      amount: z.string().optional().describe('Refund amount'),
      currencyCode: z.string().optional().describe('Currency code'),
      createdAt: z.string().optional().describe('When the refund was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BraintreeGraphQLClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    if (ctx.input.mode === 'reverse') {
      let input: Record<string, any> = {
        transactionId: ctx.input.transactionId
      };
      let result = await client.query(REVERSE_TRANSACTION, { input });
      let reversal = result.reverseTransaction.reversal;

      return {
        output: {
          refundId: reversal.id,
          legacyId: reversal.legacyId,
          status: reversal.status,
          amount: reversal.amount?.value,
          currencyCode: reversal.amount?.currencyCode,
          createdAt: reversal.createdAt
        },
        message: `Transaction reversed — reversal \`${reversal.legacyId}\` status: **${reversal.status}**`
      };
    }

    let input: Record<string, any> = {
      transactionId: ctx.input.transactionId
    };
    if (ctx.input.amount) {
      input.refund = { amount: ctx.input.amount };
    }
    if (ctx.input.orderId) {
      input.refund = { ...input.refund, orderId: ctx.input.orderId };
    }

    let result = await client.query(REFUND_TRANSACTION, { input });
    let refund = result.refundTransaction.refund;

    return {
      output: {
        refundId: refund.id,
        legacyId: refund.legacyId,
        status: refund.status,
        amount: refund.amount?.value,
        currencyCode: refund.amount?.currencyCode,
        createdAt: refund.createdAt
      },
      message: `Refund \`${refund.legacyId}\` issued for **${refund.amount?.value} ${refund.amount?.currencyCode || ''}** — status: **${refund.status}**`
    };
  })
  .build();
