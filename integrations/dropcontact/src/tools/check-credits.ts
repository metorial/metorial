import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits',
  key: 'check_credits',
  description: `Check the remaining enrichment credits on your Dropcontact account.
Each credit corresponds to one email found or verified. Credits are only consumed on success — if no email is found, no credit is used.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creditsLeft: z.number().describe('Number of remaining enrichment credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.checkCredits();

    return {
      output: {
        creditsLeft: result.credits_left
      },
      message: `You have **${result.credits_left}** credits remaining.`
    };
  })
  .build();
