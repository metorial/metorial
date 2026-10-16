import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credit Balance',
  key: 'check_credits',
  description: `Check the remaining query credits available on your IP2Proxy account. The balance can lag usage by 10 minutes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      response: z.string().describe('Response status from the API.'),
      credits: z
        .string()
        .describe('Remaining query credits; the balance can lag by 10 minutes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.checkCredits();

    return {
      output: {
        response: result.response,
        credits: result.credits
      },
      message: `IP2Proxy reports **${result.credits}** credits remaining. The balance can lag usage by 10 minutes.`
    };
  })
  .build();
