import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve your SearchApi account information including search usage statistics. Shows total searches performed this month, maximum allowable searches, and remaining search credits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalSearchesThisMonth: z
        .number()
        .optional()
        .describe('Searches performed this billing period'),
      maxSearchesPerMonth: z
        .number()
        .optional()
        .describe('Maximum searches allowed per month'),
      remainingSearches: z.number().optional().describe('Remaining search credits'),
      searchesThisHour: z.number().optional().describe('Searches performed this hour'),
      hourlyRateLimit: z.number().optional().describe('Hourly search limit'),
      subscriptionPeriodStart: z.string().optional().describe('Subscription period start'),
      subscriptionPeriodEnd: z.string().optional().describe('Subscription period end'),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.getAccount();

    let total = data.account.current_month_usage;
    let max = data.account.monthly_allowance;
    let remaining = data.account.remaining_credits;

    return {
      output: {
        totalSearchesThisMonth: total,
        maxSearchesPerMonth: max,
        remainingSearches: remaining,
        searchesThisHour: data.api_usage?.searches_this_hour,
        hourlyRateLimit: data.api_usage?.hourly_rate_limit,
        subscriptionPeriodStart: data.subscription?.period_start,
        subscriptionPeriodEnd: data.subscription?.period_end,
        raw: data
      },
      message: `Account usage: ${total ?? 'N/A'} / ${max ?? 'N/A'} searches used this month. ${remaining ?? 'N/A'} remaining.`
    };
  })
  .build();
