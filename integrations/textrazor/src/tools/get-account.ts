import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve information about the TextRazor account, including the current subscription plan, concurrent request limits, and daily API usage statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      plan: z.string().describe('Current subscription plan name'),
      concurrentRequestLimit: z
        .number()
        .describe('Maximum number of concurrent requests allowed'),
      concurrentRequestsUsed: z
        .number()
        .describe('Number of concurrent requests currently in use'),
      planDailyIncludedRequests: z
        .number()
        .describe('Number of daily requests included in the plan'),
      requestsUsedToday: z.number().describe('Number of requests used today')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccount();

    return {
      output: account,
      message: `Plan: **${account.plan}** | Requests today: **${account.requestsUsedToday}/${account.planDailyIncludedRequests}** | Concurrent: **${account.concurrentRequestsUsed}/${account.concurrentRequestLimit}**`
    };
  })
  .build();
