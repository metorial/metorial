import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get API Usage',
  key: 'get_usage',
  description: `Retrieve DNS and network API usage counters and plan limits. Includes combined totals for compatibility; each lookup type consumes its own quota, so check the separate counters before running diagnostics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      used: z.number().describe('Combined DNS and network requests consumed'),
      limit: z.number().describe('Combined DNS and network request limits'),
      remaining: z
        .number()
        .describe('Combined remaining requests; quotas are not interchangeable'),
      usagePercentage: z.number().describe('Percentage of the combined request limits used'),
      dnsRequests: z
        .number()
        .optional()
        .describe('DNS requests consumed, when supplied by the API'),
      dnsMax: z.number().optional().describe('DNS request limit, when supplied by the API'),
      networkRequests: z
        .number()
        .optional()
        .describe('Network requests consumed, when supplied by the API'),
      networkMax: z
        .number()
        .optional()
        .describe('Network request limit, when supplied by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let usage = await client.getUsage();
    let remaining = Math.max(0, usage.limit - usage.used);
    let usagePercentage = usage.limit > 0 ? Math.round((usage.used / usage.limit) * 100) : 0;

    return {
      output: {
        ...usage,
        remaining,
        usagePercentage
      },
      message:
        usage.dnsRequests !== undefined
          ? `DNS API usage: **${usage.dnsRequests}/${usage.dnsMax}**. Network API usage: **${usage.networkRequests}/${usage.networkMax}**. These quotas are tracked separately.`
          : `API usage: **${usage.used}/${usage.limit}** requests used (**${usagePercentage}%**). ${remaining} requests remaining.`
    };
  })
  .build();
