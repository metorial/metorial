import { SlateTool } from 'slates';
import { z } from 'zod';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let depositWithdraw = SlateTool.create(spec, {
  name: 'Deposit or Withdraw Fiat',
  key: 'deposit_withdraw',
  description: `Deposit fiat currency from a bank account or withdraw fiat to a bank account. Requires a linked payment method. Set **commit** to true to execute or false to preview.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      action: z.enum(['deposit', 'withdraw']).describe('Whether to deposit or withdraw'),
      accountId: z.string().describe('Fiat account ID'),
      amount: z.string().describe('Amount to deposit or withdraw'),
      currency: z.string().describe('Fiat currency code (e.g., USD, EUR)'),
      paymentMethodId: z.string().describe('Payment method ID (bank account)'),
      commit: z.boolean().optional().describe('Set true to execute, false to preview')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Deposit/withdrawal ID'),
      status: z.string().describe('Status of the operation'),
      amount: z.string().optional().describe('Amount'),
      amountCurrency: z.string().optional().describe('Currency code'),
      fee: z.string().optional().describe('Fee amount'),
      feeCurrency: z.string().optional().describe('Fee currency'),
      subtotal: z.string().optional().describe('Subtotal'),
      subtotalCurrency: z.string().optional().describe('Subtotal currency'),
      payoutAt: z.string().optional().nullable().describe('Expected payout time'),
      committed: z.boolean().optional().describe('Whether committed'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    let params = {
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      paymentMethod: ctx.input.paymentMethodId,
      commit: ctx.input.commit
    };

    let result: any;
    if (ctx.input.action === 'deposit') {
      result = await client.createDeposit(ctx.input.accountId, params);
    } else {
      result = await client.createWithdrawal(ctx.input.accountId, params);
    }

    let actionLabel = ctx.input.action === 'deposit' ? 'Deposited' : 'Withdrew';

    return {
      output: {
        operationId: result.id,
        status: result.status,
        amount: result.amount?.amount,
        amountCurrency: result.amount?.currency,
        fee: result.fee?.amount,
        feeCurrency: result.fee?.currency,
        subtotal: result.subtotal?.amount,
        subtotalCurrency: result.subtotal?.currency,
        payoutAt: result.payout_at || null,
        committed: result.committed,
        createdAt: result.created_at
      },
      message: `${actionLabel} **${result.amount?.amount} ${result.amount?.currency}** — Status: ${result.status}`
    };
  })
  .build();
