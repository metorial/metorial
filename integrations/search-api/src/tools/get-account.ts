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
      remainingSearches: z.number().optional().describe('Remaining search credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.getAccount();

    let total = data.total_searches_this_month ?? data.total_searches;
    let max = data.max_searches_per_month ?? data.plan_searches_per_month;
    let remaining =
      data.remaining_searches ??
      (max !== undefined && total !== undefined ? max - total : undefined);

    return {
      output: {
        totalSearchesThisMonth: total,
        maxSearchesPerMonth: max,
        remainingSearches: remaining
      },
      message: `Account usage: ${total ?? 'N/A'} / ${max ?? 'N/A'} searches used this month. ${remaining ?? 'N/A'} remaining.`
    };
  })
  .build();
