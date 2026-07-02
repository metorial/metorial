import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRemainingCredits = SlateTool.create(spec, {
  name: 'Get Remaining Credits',
  key: 'get_remaining_credits',
  description: `Check the number of monthly data credits remaining in your SimilarWeb account. This does not consume any data credits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingHits: z
        .number()
        .describe('Number of data credits remaining for the current month.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCapabilities();

    return {
      output: {
        remainingHits: result.remainingHits
      },
      message: `You have **${result.remainingHits}** data credits remaining this month.`
    };
  })
  .build();
