import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description: `Check the remaining credit balance in your FullEnrich workspace. Useful for monitoring usage before starting enrichment batches.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.number().describe('Number of credits available in the workspace')
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
