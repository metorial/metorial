import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits',
  key: 'check_credits',
  description: `Check the remaining enrichment credits on your Dropcontact account.
Email finding consumes a credit when an email is found; unsuccessful searches are refunded. Submitting an existing email for verification consumes one credit.`,
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
