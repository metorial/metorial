import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve RedCircle API account information including credit usage, remaining credits, plan details, quota limits, usage history, and platform operational status. This endpoint is free and does not consume credits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creditsUsed: z
        .number()
        .optional()
        .describe('Number of credits used in the current billing period.'),
      creditsLimit: z
        .number()
        .optional()
        .describe('Total credits available in the current billing period.'),
      creditsRemaining: z
        .number()
        .optional()
        .describe('Credits remaining in the current billing period.'),
      creditsResetAt: z.string().optional().describe('Timestamp when credits reset.'),
      accountName: z.string().optional().describe('Account holder name.'),
      accountEmail: z.string().optional().describe('Account email address.'),
      plan: z.string().optional().describe('Current subscription plan.'),
      destinationsUsed: z.number().optional().describe('Number of destinations configured.'),
      destinationsLimit: z
        .number()
        .optional()
        .describe('Maximum number of destinations allowed.'),
      collectionsUsed: z.number().optional().describe('Number of active collections.'),
      collectionsLimit: z
        .number()
        .optional()
        .describe('Maximum number of collections allowed.'),
      usageHistory: z
        .array(z.any())
        .optional()
        .describe('Daily usage breakdown for the past 3 months.'),
      systemStatus: z
        .array(z.any())
        .optional()
        .describe('Operational status of RedCircle API components.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAccount();

    let account = data.account_info ?? {};
    let credits = data.credits ?? {};
    let quotas = data.quotas ?? {};

    return {
      output: {
        creditsUsed: credits.credits_used,
        creditsLimit: credits.credits_limit,
        creditsRemaining: credits.credits_remaining,
        creditsResetAt: credits.credits_reset_at,
        accountName: account.name,
        accountEmail: account.email,
        plan: account.plan,
        destinationsUsed: quotas.destinations_used,
        destinationsLimit: quotas.destinations_limit,
        collectionsUsed: quotas.collections_used,
        collectionsLimit: quotas.collections_limit,
        usageHistory: data.usage_history,
        systemStatus: data.status
      },
      message: `Account: **${account.name ?? 'N/A'}** (${account.plan ?? 'unknown plan'}). Credits: **${credits.credits_remaining ?? 0}** remaining of ${credits.credits_limit ?? 0}.`
    };
  })
  .build();
