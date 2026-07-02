import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description: `Retrieve the current credit balance available in your Datagma account. Useful for monitoring usage and ensuring sufficient credits before running enrichment operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      credits: z.number().describe('Current credit balance in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getCreditBalance();

    let credits = result?.id ?? result?.credits ?? 0;

    return {
      output: {
        credits: typeof credits === 'number' ? credits : Number(credits)
      },
      message: `Current credit balance: **${credits}** credits.`
    };
  })
  .build();
