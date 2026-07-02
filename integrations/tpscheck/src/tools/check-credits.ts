import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits',
  key: 'check_credits',
  description: `Retrieve your current TPSCheck API credit usage, remaining credits, monthly limit, plan name, and credit reset date.
Useful for monitoring usage and ensuring you don't run out of credits before your next billing cycle.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      requestsUsed: z
        .number()
        .describe('Number of API requests used in the current billing period'),
      requestsRemaining: z.number().describe('Number of API requests remaining'),
      monthlyLimit: z.number().describe('Total monthly request limit for your plan'),
      plan: z.string().describe('Name of your current plan'),
      resetDate: z.string().describe('Date when credits reset (ISO 8601 format)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let credits = await client.getCredits();

    let usagePercent =
      credits.monthly_limit > 0
        ? Math.round((credits.requests_used / credits.monthly_limit) * 100)
        : 0;

    return {
      output: {
        requestsUsed: credits.requests_used,
        requestsRemaining: credits.requests_remaining,
        monthlyLimit: credits.monthly_limit,
        plan: credits.plan,
        resetDate: credits.reset_date
      },
      message: `**${credits.plan}** plan: **${credits.requests_used}**/${credits.monthly_limit} credits used (${usagePercent}%). Resets on ${credits.reset_date}.`
    };
  })
  .build();
