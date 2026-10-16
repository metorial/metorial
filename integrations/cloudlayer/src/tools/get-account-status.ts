import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numberValue, rawResponse, timestampValue } from '../lib/responses';
import { spec } from '../spec';

export let getAccountStatus = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description: `Check your Cloudlayer account status including remaining API credits and rate limit information. This endpoint does not consume API credits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creditsRemaining: z.number().optional().describe('Number of API credits remaining'),
      rateLimitRemaining: z.number().optional().describe('Rate limit requests remaining'),
      rateLimitTotal: z.number().optional().describe('Total rate limit requests allowed'),
      rateLimitResetAt: z
        .string()
        .optional()
        .describe('When the rate limit resets (ISO 8601)'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider response details with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getStatus();

    let rateLimit =
      result.rateLimit &&
      typeof result.rateLimit === 'object' &&
      !Array.isArray(result.rateLimit)
        ? (result.rateLimit as Record<string, unknown>)
        : {};
    let output = pickDefined({
      creditsRemaining: numberValue(
        result.creditsRemaining,
        result.credits,
        result.remaining,
        result.credit
      ),
      rateLimitRemaining: numberValue(result.rateLimitRemaining, rateLimit.remaining),
      rateLimitTotal: numberValue(result.rateLimitTotal, rateLimit.total),
      rateLimitResetAt: timestampValue(result.rateLimitResetAt, rateLimit.resetAt),
      raw: rawResponse(result)
    });
    return {
      output,
      message: 'Retrieved the account status reported by Cloudlayer.'
    };
  })
  .build();
