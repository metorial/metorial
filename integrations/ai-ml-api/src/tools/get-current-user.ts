import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the account associated with the API key and check its current balance and currency.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Account user ID'),
      email: z.string().describe('Account email address'),
      balance: z.number().describe('Current balance'),
      currency: z.string().describe('Balance currency')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.getCurrentUser();
    return {
      output: {
        userId: result.user_id,
        email: result.email,
        balance: result.current_balance,
        currency: result.currency
      },
      message: `Connected account: **${result.email}**. Balance: ${result.current_balance} ${result.currency}.`
    };
  })
  .build();
