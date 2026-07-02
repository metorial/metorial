import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve current API key usage statistics and subscription information. Shows the number of API calls made in the current billing cycle and lifetime, as well as subscription limits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apiKeyCurrentCycle: z
        .number()
        .nullable()
        .describe('Number of API calls made with this key in the current billing cycle'),
      apiKeyLifetime: z
        .number()
        .describe('Total number of API calls made with this key over its lifetime'),
      accountCurrentCycle: z
        .number()
        .nullable()
        .describe('Total API calls across all keys in the current billing cycle'),
      accountLifetime: z
        .number()
        .describe('Total API calls across all keys over their lifetime'),
      lifetimeUsageLimit: z
        .number()
        .nullable()
        .describe('Maximum lifetime API calls allowed by the subscription'),
      currentCycleFreeUsageLimit: z
        .number()
        .nullable()
        .describe('Number of free API calls available in the current billing cycle'),
      currentCycleStart: z
        .string()
        .nullable()
        .describe('Start date of the current billing cycle'),
      currentCycleEnd: z.string().nullable().describe('End date of the current billing cycle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUsage();
    let usage = result.data;

    return {
      output: {
        apiKeyCurrentCycle: usage.api_key_usage.current_cycle,
        apiKeyLifetime: usage.api_key_usage.lifetime,
        accountCurrentCycle: usage.total_account_usage.current_cycle,
        accountLifetime: usage.total_account_usage.lifetime,
        lifetimeUsageLimit: usage.current_subscription?.lifetime_usage_limit ?? null,
        currentCycleFreeUsageLimit:
          usage.current_subscription?.current_cycle_free_usage_limit ?? null,
        currentCycleStart: usage.current_subscription?.current_cycle_start ?? null,
        currentCycleEnd: usage.current_subscription?.current_cycle_end ?? null
      },
      message: `API key usage: **${usage.api_key_usage.current_cycle ?? 0}** calls this cycle, **${usage.api_key_usage.lifetime}** lifetime. Account total: **${usage.total_account_usage.lifetime}** lifetime calls.`
    };
  })
  .build();
