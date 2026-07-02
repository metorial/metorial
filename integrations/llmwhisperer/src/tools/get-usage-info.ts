import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsageInfo = SlateTool.create(spec, {
  name: 'Get Usage Info',
  key: 'get_usage_info',
  description: `Retrieve account usage metrics including page counts, quotas, and subscription plan details. Useful for monitoring consumption and quota limits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subscriptionPlan: z.string().describe('Current subscription plan name.'),
      monthlyQuota: z
        .number()
        .describe('Monthly page quota. -1 if not applicable (free plans).'),
      currentPageCount: z
        .any()
        .describe(
          'Pages processed this month, broken down by mode (native_text, low_cost, high_quality, form).'
        ),
      overagePageCount: z
        .number()
        .describe('Number of pages exceeding the monthly quota. -1 if not applicable.'),
      todayPageCount: z.number().describe('Pages processed today.'),
      dailyQuota: z.number().describe('Daily page quota. -1 if not applicable (paid plans).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let usage = await client.getUsageInfo();

    return {
      output: usage,
      message: `Plan: **${usage.subscriptionPlan}**. Today: ${usage.todayPageCount} pages. Monthly quota: ${usage.monthlyQuota === -1 ? 'N/A' : usage.monthlyQuota}.`
    };
  })
  .build();
