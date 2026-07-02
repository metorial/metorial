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

    let rateLimit = data.rateLimit as Record<string, unknown> | undefined;
    let create = (rateLimit?.measurements as Record<string, unknown> | undefined)?.create as
      | Record<string, unknown>
      | undefined;

    let creditsRemaining: number | null | undefined;
    if (
      data.credits &&
      typeof data.credits === 'object' &&
      'remaining' in (data.credits as Record<string, unknown>)
    ) {
      creditsRemaining = (data.credits as Record<string, unknown>).remaining as number;
    }

    return {
      output: {
        rateLimit: {
          measurementsCreate: {
            type: (create?.type as string) ?? 'ip',
            limit: (create?.limit as number) ?? 0,
            remaining: (create?.remaining as number) ?? 0,
            reset: (create?.reset as number) ?? 0
          }
        },
        creditsRemaining
      },
      message: `Rate limit: **${create?.remaining ?? 0}** / **${create?.limit ?? 0}** measurements remaining. Resets in **${create?.reset ?? 0}** seconds.${creditsRemaining !== undefined ? ` Credits remaining: **${creditsRemaining}**.` : ''}`
    };
  })
  .build();
