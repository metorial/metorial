import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  name: 'Get Credits Balance',
  key: 'get_credits',
  description: `Check your current Findymail account credit balance. Useful for monitoring usage before running enrichment operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      credits: z.number().optional().describe('Remaining credits in the account.'),
      used: z.number().optional().describe('Credits used in the current billing period.'),
      total: z.number().optional().describe('Total credits in the current billing period.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });

    let result = await client.getCredits();

    let credits = result?.credits ?? result?.remaining ?? result?.balance ?? undefined;
    let used = result?.used ?? result?.credits_used ?? undefined;
    let total = result?.total ?? result?.credits_total ?? undefined;

    return {
      output: {
        credits,
        used,
        total
      },
      message:
        credits !== undefined
          ? `You have **${credits}** credits remaining${total !== undefined ? ` out of ${total}` : ''}${used !== undefined ? ` (${used} used)` : ''}.`
          : `Retrieved credit balance information.`
    };
  })
  .build();
