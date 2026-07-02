import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits Balance',
  key: 'check_credits',
  description: `Check your BetterContact account's remaining credit balance and associated email address. Use this to monitor credit usage before or after enrichment requests.`,

  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creditsLeft: z.number().describe('Number of remaining credits in the account'),
      email: z.string().describe('Email address associated with the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCreditsBalance();

    return {
      output: {
        creditsLeft: result.creditsLeft,
        email: result.email
      },
      message: `Account **${result.email}** has **${result.creditsLeft}** credits remaining.`
    };
  })
  .build();
