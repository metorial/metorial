import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountStats = SlateTool.create(spec, {
  name: 'Get Account Stats',
  key: 'get_account_stats',
  description: `Retrieve your Scrape.do account usage statistics including subscription status, concurrent request limits, and remaining monthly request quota.`,
  constraints: ['This endpoint is rate-limited to 10 requests per minute.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      isActive: z.boolean().describe('Whether the subscription is active'),
      concurrentRequestLimit: z.number().describe('Maximum concurrent requests allowed'),
      maxMonthlyRequests: z.number().describe('Maximum requests per month'),
      remainingConcurrentRequests: z
        .number()
        .describe('Currently available concurrent request slots'),
      remainingMonthlyRequests: z.number().describe('Remaining requests for this month')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let stats = await client.getAccountStats();

    return {
      output: {
        isActive: stats.IsActive,
        concurrentRequestLimit: stats.ConcurrentRequest,
        maxMonthlyRequests: stats.MaxMonthlyRequest,
        remainingConcurrentRequests: stats.RemainingConcurrentRequest,
        remainingMonthlyRequests: stats.RemainingMonthlyRequest
      },
      message: `Account is **${stats.IsActive ? 'active' : 'inactive'}**. Remaining: **${stats.RemainingMonthlyRequest.toLocaleString()}** of ${stats.MaxMonthlyRequest.toLocaleString()} monthly requests. Concurrent: **${stats.RemainingConcurrentRequest}**/${stats.ConcurrentRequest}.`
    };
  })
  .build();
