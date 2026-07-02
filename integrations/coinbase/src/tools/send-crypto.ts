import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let sendCrypto = SlateTool.create(spec, {
  name: 'Send Crypto',
  key: 'send_crypto',
  description: `Send cryptocurrency from a Coinbase account to an external address or another Coinbase user. Specify the recipient, amount, and currency. Requires the **wallet:transactions:send** scope.`,
  instructions: [
    'The "to" field can be a cryptocurrency address, email address, or Coinbase user ID.',
    'Use "idem" for idempotent sends to avoid duplicate transactions.'
  ],
  constraints: ['Two-factor authentication may be required for sends.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Source account ID to send from'),
      to: z.string().describe('Recipient — a crypto address, email, or Coinbase user ID'),
      amount: z.string().describe('Amount to send (e.g., "0.01")'),
      currency: z.string().describe('Currency code (e.g., BTC, ETH, USDC)'),
      description: z.string().optional().describe('Optional note for the transaction'),
      idem: z.string().optional().describe('Idempotency key to prevent duplicate sends')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      transactionType: z.string().describe('Transaction type'),
      status: z.string().describe('Transaction status'),
      amount: z.string().describe('Amount sent'),
      currency: z.string().describe('Currency code'),
      nativeAmount: z.string().optional().describe('Amount in native currency'),
      nativeCurrency: z.string().optional().describe('Native currency code'),
      to: z.string().optional().describe('Recipient address or identifier'),
      description: z.string().optional().nullable().describe('Transaction description'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    let tx = await client.sendMoney(ctx.input.accountId, {
      to: ctx.input.to,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      description: ctx.input.description,
      idem: ctx.input.idem
    });

    return {
      output: {
        transactionId: tx.id,
        transactionType: tx.type,
        status: tx.status,
        amount: tx.amount?.amount,
        currency: tx.amount?.currency,
        nativeAmount: tx.native_amount?.amount,
        nativeCurrency: tx.native_amount?.currency,
        to: tx.to?.address || tx.to?.email || tx.to?.id,
        description: tx.description || null,
        createdAt: tx.created_at
      },
      message: `Sent **${tx.amount?.amount} ${tx.amount?.currency}** to ${ctx.input.to} — Status: ${tx.status}`
    };
  })
  .build();
