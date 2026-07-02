import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  name: 'Get Credits',
  key: 'get_credits',
  description: `Retrieves the current API credit balance and total credits used for the account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingCredits: z.number().describe('Number of credits remaining in the account'),
      totalCreditsUsed: z.number().describe('Total number of credits consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getCredits();

    return {
      output: {
        remainingCredits: response.remaining_credits,
        totalCreditsUsed: response.total_credits_used
      },
      message: `**${response.remaining_credits}** credits remaining. **${response.total_credits_used}** credits used total.`
    };
  })
  .build();
