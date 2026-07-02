import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get API Usage',
  key: 'get_usage',
  description: `Retrieve the current API usage statistics for your MXToolbox account. Shows how many API requests have been consumed and the maximum allowed for your subscription plan.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      used: z.number().describe('Number of API requests consumed'),
      limit: z.number().describe('Maximum number of API requests allowed in your plan'),
      remaining: z.number().describe('Number of API requests remaining'),
      usagePercentage: z.number().describe('Percentage of API quota used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let usage = await client.getUsage();
    let remaining = Math.max(0, usage.limit - usage.used);
    let usagePercentage = usage.limit > 0 ? Math.round((usage.used / usage.limit) * 100) : 0;

    return {
      output: {
        used: usage.used,
        limit: usage.limit,
        remaining,
        usagePercentage
      },
      message: `API usage: **${usage.used}/${usage.limit}** requests used (**${usagePercentage}%**). ${remaining} requests remaining.`
    };
  })
  .build();
