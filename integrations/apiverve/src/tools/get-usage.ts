import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  key: 'get_usage',
  name: 'Get Account Usage',
  description:
    'Read the account plan, credit balance, rate limit and renewal date. This endpoint does not spend API credits.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      plan: z.string(),
      creditsUsed: z.number(),
      creditsRemaining: z.number(),
      creditsLimit: z.number(),
      bonusCredits: z.number(),
      usagePercent: z.number(),
      renewalDate: z.string(),
      rateLimit: z.string(),
      detailed: z.boolean(),
      rawData: z.any().optional().describe('Complete provider usage result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { data } = await client.getUsage();
    let summary = data.summary;
    return {
      output: client.sanitize({
        plan: summary.plan,
        creditsUsed: summary.tokensUsed,
        creditsRemaining: summary.tokensRemaining,
        creditsLimit: summary.tokensLimit,
        bonusCredits: summary.bonusTokens,
        usagePercent: summary.usagePercent,
        renewalDate: summary.renewalDate,
        rateLimit: summary.rateLimit,
        detailed: data.detailed,
        rawData: data
      }),
      message: 'Retrieved the account credit balance and plan.'
    };
  })
  .build();
