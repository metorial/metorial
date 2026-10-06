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
      balance: z.string().nullish().describe('Current account balance'),
      currency: z.string().nullish().describe('Currency code (e.g., "USD")'),
      creditLimit: z.string().nullish().describe('Credit limit on the account'),
      availableCredit: z.string().nullish().describe('Available credit'),
      pending: z
        .string()
        .optional()
        .describe('Native pending amount, in the returned currency')
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
        availableCredit: result.available_credit,
        pending: result.pending
      },
      message: `Account balance: **${result.balance} ${result.currency}**.`
    };
  })
  .build();
