import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRemainingCredits = SlateTool.create(spec, {
  name: 'Get Remaining Credits',
  key: 'get_remaining_credits',
  description: `Check the remaining API credit balance for your Interzoid account. Each API call consumes credits; premium APIs consume more credits per call.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingCredits: z.number().describe('Number of remaining API credits'),
      code: z.string().describe('API response status code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getRemainingCredits();

    return {
      output: {
        remainingCredits: result.Credits,
        code: result.Code
      },
      message: `Remaining credits: **${result.Credits}**`
    };
  })
  .build();
