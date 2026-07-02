import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credit Balance',
  key: 'check_credits',
  description: `Check the remaining query credits available on your IP2Proxy account. Useful for monitoring usage and ensuring you have sufficient credits before performing lookups.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      response: z.string().describe('Response status from the API.'),
      credits: z.string().describe('Number of remaining query credits.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.checkCredits();

    return {
      output: {
        response: result.response || '',
        credits: result.credits || '0'
      },
      message: `You have **${result.credits}** credits remaining.`
    };
  })
  .build();
