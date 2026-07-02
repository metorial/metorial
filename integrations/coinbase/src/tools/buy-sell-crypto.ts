import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let buySellCrypto = SlateTool.create(spec, {
  name: 'Buy or Sell Crypto',
  key: 'buy_sell_crypto',
  description: `Buy or sell cryptocurrency using a linked payment method. Specify either an **amount** of crypto to buy/sell or a **total** fiat amount to spend/receive. Set **commit** to true to execute immediately or false to preview.`,
  instructions: [
    'Use "amount" to specify an exact crypto amount, or "total" to specify a fiat amount.',
    'Set commit to false to get a quote without executing, then commit=true to finalize.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['buy', 'sell']).describe('Whether to buy or sell'),
      accountId: z.string().describe('Account ID to buy into or sell from'),
      amount: z.string().optional().describe('Amount of crypto to buy/sell (e.g., "0.5")'),
      total: z
        .string()
        .optional()
        .describe('Total fiat amount to spend (buy) or receive (sell)'),
      currency: z.string().describe('Currency code of the crypto (e.g., BTC, ETH)'),
      paymentMethodId: z.string().optional().describe('Payment method ID to use'),
      commit: z
        .boolean()
        .optional()
        .describe('Set true to execute, false to preview (default true)')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Buy/sell resource ID'),
      status: z.string().describe('Status of the operation'),
      payoutAt: z.string().optional().nullable().describe('Expected payout time'),
      amount: z.string().optional().describe('Crypto amount'),
      amountCurrency: z.string().optional().describe('Crypto currency'),
      total: z.string().optional().describe('Total fiat amount'),
      totalCurrency: z.string().optional().describe('Fiat currency'),
      subtotal: z.string().optional().describe('Subtotal before fees'),
      subtotalCurrency: z.string().optional().describe('Subtotal currency'),
      fee: z.string().optional().describe('Fee amount'),
      feeCurrency: z.string().optional().describe('Fee currency'),
      committed: z.boolean().optional().describe('Whether the operation was committed'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    let params = {
      amount: ctx.input.amount,
      total: ctx.input.total,
      currency: ctx.input.currency,
      paymentMethod: ctx.input.paymentMethodId,
      commit: ctx.input.commit
    };

    let result: any;
    if (ctx.input.action === 'buy') {
      result = await client.createBuy(ctx.input.accountId, params);
    } else {
      result = await client.createSell(ctx.input.accountId, params);
    }

    let actionLabel = ctx.input.action === 'buy' ? 'Bought' : 'Sold';

    return {
      output: {
        operationId: result.id,
        status: result.status,
        payoutAt: result.payout_at || null,
        amount: result.amount?.amount,
        amountCurrency: result.amount?.currency,
        total: result.total?.amount,
        totalCurrency: result.total?.currency,
        subtotal: result.subtotal?.amount,
        subtotalCurrency: result.subtotal?.currency,
        fee: result.fee?.amount,
        feeCurrency: result.fee?.currency,
        committed: result.committed,
        createdAt: result.created_at
      },
      message: `${actionLabel} **${result.amount?.amount} ${result.amount?.currency}** for ${result.total?.amount} ${result.total?.currency} — Status: ${result.status}`
    };
  })
  .build();
