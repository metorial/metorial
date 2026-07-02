import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFundBalance = SlateTool.create(spec, {
  name: 'Get Fund Balance',
  key: 'get_fund_balance',
  description: `Retrieve the current balance of your Daffy donor-advised fund, including total amount, pending deposits, portfolio value, and available balance for donations.`,
  constraints: ['Only accessible for your own fund, not other users.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      amount: z.number().describe('Total fund amount in USD'),
      pendingDepositBalance: z
        .number()
        .describe('Money deposited but not yet accounted in USD'),
      portfolioBalance: z.number().describe('Money invested in your portfolio in USD'),
      availableBalance: z.number().describe('Money available for donations in USD')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let balance = await client.getBalance();

    return {
      output: {
        amount: balance.amount,
        pendingDepositBalance: balance.pending_deposit_balance,
        portfolioBalance: balance.portfolio_balance,
        availableBalance: balance.available_balance
      },
      message: `Fund balance: **$${balance.amount.toFixed(2)}** total, **$${balance.available_balance.toFixed(2)}** available for donations, **$${balance.portfolio_balance.toFixed(2)}** invested, **$${balance.pending_deposit_balance.toFixed(2)}** pending.`
    };
  })
  .build();
