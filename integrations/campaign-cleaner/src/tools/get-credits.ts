import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  name: 'Get Credits',
  key: 'get_credits',
  description: `Check the number of available credits in your Campaign Cleaner account. Each campaign submission for processing consumes one credit.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      credits: z.number().describe('Number of credits currently available in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCredits();

    return {
      output: {
        credits: result.credits
      },
      message: `You have **${result.credits}** credits available.`
    };
  })
  .build();
