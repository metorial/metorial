import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description: `Check your organisation's current Dripcel credit balance.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.number().describe('Current credit balance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBalance();
    let balance = typeof result.data === 'number' ? result.data : result.data?.balance;
    if (typeof balance !== 'number') {
      throw createApiServiceError('Dripcel did not return a valid credit balance.');
    }
    return {
      output: { balance },
      message: `Current credit balance: **${balance}** credits.`
    };
  })
  .build();
