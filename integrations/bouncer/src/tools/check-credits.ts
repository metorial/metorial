import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits',
  key: 'check_credits',
  description: `Check the available verification credits on your Bouncer account. Useful for monitoring usage and ensuring sufficient credits before running verifications.`,
  constraints: ['Rate limited to 10 requests per minute.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      credits: z.number().describe('Number of available verification credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCredits();

    return {
      output: result,
      message: `Available credits: **${result.credits}**`
    };
  })
  .build();
