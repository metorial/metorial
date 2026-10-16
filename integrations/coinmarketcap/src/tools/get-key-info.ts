import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let creditUsageSchema = z.object({
  creditsUsed: z.number().describe('API credits used during this period'),
  creditsLeft: z.number().describe('API credits remaining during this period')
});

export let getKeyInfo = SlateTool.create(spec, {
  name: 'Get API Key Info',
  key: 'get_key_info',
  description:
    'Retrieve the connected API key plan limits and current minute, daily, and monthly usage. Check available capacity before making market-data requests.',
  constraints: ['Uses no API credits, but counts toward the per-minute request limit.'],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      plan: z.object({
        creditLimitMonthly: z.number().describe('Monthly API credit limit'),
        creditLimitMonthlyReset: z
          .string()
          .describe('Time remaining until monthly credits reset'),
        creditLimitMonthlyResetTimestamp: z.string().describe('Monthly reset timestamp'),
        rateLimitMinute: z.number().describe('Maximum requests per minute')
      }),
      usage: z.object({
        currentMinute: z.object({
          requestsMade: z.number().describe('Requests made during the current minute'),
          requestsLeft: z.number().describe('Requests remaining during the current minute')
        }),
        currentDay: creditUsageSchema,
        currentMonth: creditUsageSchema
      }),
      raw: z.unknown().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let data = await client.getKeyInfo();
    return {
      output: { ...data, raw: client.rawResponse },
      message: `Retrieved API key usage: ${data.usage.currentMonth.creditsLeft} monthly credits remaining.`
    };
  })
  .build();
