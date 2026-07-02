import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let checkUsage = SlateTool.create(spec, {
  name: 'Check API Usage',
  key: 'check_usage',
  description: `Check your current Piloterr plan and remaining API credits. Useful for monitoring usage and ensuring you have enough credits before making API calls.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      plan: z.string().optional().describe('Current subscription plan'),
      remaining: z.number().optional().describe('Remaining API credits'),
      renewalDate: z.string().nullable().optional().describe('Next credit renewal date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getUsage();

    return {
      output: {
        plan: result.plan,
        remaining: result.remaining,
        renewalDate: result.renewal_date
      },
      message: `**${result.plan ?? 'Unknown'}** plan — **${result.remaining ?? 0} credits** remaining${result.renewal_date ? ` (renews: ${result.renewal_date})` : ''}.`
    };
  })
  .build();
