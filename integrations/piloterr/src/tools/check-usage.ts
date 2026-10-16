import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let checkUsageOutputSchema = z.object({
  raw: z.any().describe('Full provider response'),
  plan: z.string().optional().describe('Current subscription plan'),
  remaining: z.number().optional().describe('Remaining API credits'),
  totalUsed: z.number().optional(),
  account: z.object({ name: z.string().optional(), slug: z.string().optional() }).optional(),
  apiKey: z.any().optional(),
  period: z.any().optional(),
  subscription: z.any().optional(),
  packs: z.any().optional(),
  credits: z.any().optional(),
  rateLimit: z.any().optional(),
  renewalDate: z.string().nullable().optional().describe('Next credit renewal date')
});

export let checkUsage = SlateTool.create(spec, {
  name: 'Check API Usage',
  key: 'check_usage',
  description: `Check remaining credits, subscription and pack balances, rate limits, account identity, and API key status. This endpoint costs no credits. A plan name is returned only when provided by the API.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(checkUsageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.getUsage();

    return {
      output: normalizeOutput(checkUsageOutputSchema, {
        raw: result,
        plan: result.plan,
        totalUsed: result.total_used,
        account: result.account,
        apiKey: result.api_key,
        period: result.period,
        subscription: result.subscription,
        packs: result.packs,
        credits: result.credits,
        rateLimit: result.rate_limit,
        remaining: result.remaining,
        renewalDate: result.renewal_date
      }),
      message: 'Retrieved current account usage and credit balances.'
    };
  })
  .build();
