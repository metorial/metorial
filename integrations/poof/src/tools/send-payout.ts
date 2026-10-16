import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let sendPayout = SlateTool.create(spec, {
  name: 'Send Payout',
  key: 'send_payout',
  description: `Send a cryptocurrency payout from your Poof wallet to an external address. Supports multiple cryptocurrencies including Solana, Litecoin, Bitcoin, Ethereum, and more. The payout is deducted from your Poof wallet balance.`,
  constraints: [
    'Payouts are disabled for users with external wallets.',
    'You must have sufficient balance in the respective cryptocurrency.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      amount: z.number().describe('Amount of cryptocurrency to send'),
      crypto: z
        .string()
        .describe(
          'Cryptocurrency to send (e.g., "solana", "litecoin", "bitcoin", "ethereum")'
        ),
      address: z.string().describe('Destination wallet address')
    })
  )
  .output(
    z.object({
      transactionId: z.string().optional().describe('Transaction ID of the payout'),
      address: z.string().optional().describe('Destination address'),
      amount: z.number().optional().describe('Amount sent'),
      remainingBalance: z
        .string()
        .optional()
        .describe('Remaining wallet balance after payout'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    if (!Number.isFinite(ctx.input.amount) || ctx.input.amount <= 0) {
      throw createApiServiceError('Payout amount must be greater than zero.');
    }

    let result = await client.sendPayout({
      amount: ctx.input.amount,
      crypto: ctx.input.crypto,
      address: ctx.input.address
    });

    let reportedAmount: unknown = result?.amount;
    let amount =
      typeof reportedAmount === 'number'
        ? reportedAmount
        : typeof reportedAmount === 'string' && reportedAmount.trim()
          ? Number(reportedAmount)
          : undefined;

    return {
      output: {
        transactionId: result?.transaction_id,
        address: result?.address,
        amount: amount !== undefined && Number.isFinite(amount) ? amount : undefined,
        remainingBalance: result?.remaining_balance?.toString(),
        raw: result
      },
      message: `Payout of **${ctx.input.amount} ${ctx.input.crypto}** sent to \`${ctx.input.address}\`.${result?.transaction_id ? ` Transaction ID: ${result.transaction_id}` : ''}`
    };
  })
  .build();
