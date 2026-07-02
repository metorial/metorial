import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve the current WebScraping.AI account status including remaining API credits, credit reset time, and concurrency limits.
Useful for monitoring usage and ensuring sufficient credits before running scraping tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email address.'),
      remainingApiCalls: z.number().describe('Number of remaining API credits.'),
      resetsAt: z.string().describe('Timestamp when API credits will reset.'),
      remainingConcurrency: z
        .number()
        .describe('Number of available concurrent request slots.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();

    return {
      output: account,
      message: `**Account:** ${account.email}\n**Remaining credits:** ${account.remainingApiCalls}\n**Resets at:** ${account.resetsAt}\n**Concurrency:** ${account.remainingConcurrency}`
    };
  })
  .build();
