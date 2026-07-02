import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let getBalance = SlateTool.create(spec, {
  name: 'Get Account Balance',
  key: 'get_balance',
  description: `Retrieve the current account balance and currency for your Telnyx account.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.string().optional().describe('Current account balance'),
      currency: z.string().optional().describe('Currency code (e.g., "USD")'),
      creditLimit: z.string().optional().describe('Credit limit on the account'),
      availableCredit: z.string().optional().describe('Available credit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });
    let result = await client.getBalance();

    return {
      output: {
        balance: result.balance,
        currency: result.currency,
        creditLimit: result.credit_limit,
        availableCredit: result.available_credit
      },
      message: `Account balance: **${result.balance} ${result.currency ?? 'USD'}**.`
    };
  })
  .build();
