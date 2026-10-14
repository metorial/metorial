import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description: `Check the credits currently spendable with your API key, capped by any key consumption limit. Useful for monitoring usage before starting enrichment batches.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.number().describe('Number of credits currently spendable with this API key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCreditBalance();

    return {
      output: {
        balance: result.balance
      },
      message: `Credit balance: **${result.balance}** credits remaining.`
    };
  })
  .build();
