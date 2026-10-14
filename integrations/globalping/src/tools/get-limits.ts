import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLimits = SlateTool.create(spec, {
  name: 'Get Rate Limits',
  key: 'get_limits',
  description: `Retrieve the current rate limit status for your account or IP address. Shows remaining measurement quota, rate limit type, and credits balance (for authenticated users).

Useful for checking how many tests you can still run before hitting the hourly limit.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      rateLimit: z
        .object({
          measurementsCreate: z
            .object({
              type: z.string().describe('Rate limit type: "ip" or "user"'),
              limit: z.number().describe('Total measurement points per time window'),
              remaining: z.number().describe('Remaining measurement points'),
              reset: z.number().describe('Seconds until rate limit resets')
            })
            .describe('Rate limit for creating measurements')
        })
        .describe('Current rate limits'),
      creditsRemaining: z
        .number()
        .nullable()
        .optional()
        .describe('Remaining credits (authenticated users only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getLimits();

    let create = data.rateLimit.measurements.create;
    let creditsRemaining = data.credits?.remaining;

    return {
      output: {
        rateLimit: {
          measurementsCreate: {
            type: create.type,
            limit: create.limit,
            remaining: create.remaining,
            reset: create.reset
          }
        },
        creditsRemaining
      },
      message: `Rate limit: **${create.remaining}** / **${create.limit}** measurements remaining. Resets in **${create.reset}** seconds.${creditsRemaining !== undefined ? ` Credits remaining: **${creditsRemaining}**.` : ''}`
    };
  })
  .build();
