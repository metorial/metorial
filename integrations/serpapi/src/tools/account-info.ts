import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

export let accountInfoTool = SlateTool.create(spec, {
  name: 'Account Info',
  key: 'account_info',
  description: `Retrieve SerpApi account information including current plan, monthly usage, remaining searches, and rate limits. This call is free and does not count toward the search quota.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().optional().describe('Account identifier'),
      accountEmail: z.string().optional().describe('Account email address'),
      planName: z.string().optional().describe('Current subscription plan name'),
      planMonthlyPrice: z.number().optional().describe('Monthly plan price'),
      searchesPerMonth: z.number().optional().describe('Monthly search allowance'),
      planSearchesLeft: z.number().optional().describe('Remaining searches in current plan'),
      extraCredits: z.number().optional().describe('Additional purchased credits'),
      totalSearchesLeft: z.number().optional().describe('Total available searches'),
      thisMonthUsage: z.number().optional().describe('Searches used this month'),
      lastHourSearches: z.number().optional().describe('Searches in the past hour'),
      rateLimitPerHour: z.number().optional().describe('Hourly rate limit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let data = await client.getAccount();

    return {
      output: {
        accountId: data.account_id,
        accountEmail: data.account_email,
        planName: data.plan_name,
        planMonthlyPrice: data.plan_monthly_price,
        searchesPerMonth: data.searches_per_month,
        planSearchesLeft: data.plan_searches_left,
        extraCredits: data.extra_credits,
        totalSearchesLeft: data.total_searches_left,
        thisMonthUsage: data.this_month_usage,
        lastHourSearches: data.last_hour_searches,
        rateLimitPerHour: data.account_rate_limit_per_hour
      },
      message: `Account **${data.account_email}** on the **${data.plan_name}** plan. **${data.total_searches_left}** searches remaining (${data.this_month_usage} used this month out of ${data.searches_per_month}).`
    };
  })
  .build();
