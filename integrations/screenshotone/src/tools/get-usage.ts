import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Check current API usage and remaining quota for the ScreenshotOne account.

Returns total allowed requests, used requests, available requests remaining, and current concurrency limits for the billing period.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      total: z.number().describe('Total requests allowed in the current billing period'),
      available: z.number().describe('Available requests remaining in the current period'),
      used: z.number().describe('Number of requests used so far'),
      concurrencyLimit: z.number().describe('Maximum concurrent requests allowed'),
      concurrencyRemaining: z.number().describe('Concurrent request slots currently available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let usage = await client.getUsage();

    let percentUsed = usage.total > 0 ? Math.round((usage.used / usage.total) * 100) : 0;

    return {
      output: {
        total: usage.total,
        available: usage.available,
        used: usage.used,
        concurrencyLimit: usage.concurrency.limit,
        concurrencyRemaining: usage.concurrency.remaining
      },
      message: `**Usage**: ${usage.used.toLocaleString()} / ${usage.total.toLocaleString()} requests (${percentUsed}% used). **${usage.available.toLocaleString()}** remaining. Concurrency: ${usage.concurrency.remaining}/${usage.concurrency.limit} slots available.`
    };
  })
  .build();
