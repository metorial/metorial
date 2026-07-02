import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      rateLimitResetAt: z.string().optional().describe('When the rate limit resets (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getStatus();

    return {
      output: {
        creditsRemaining: result.creditsRemaining ?? result.credits ?? result.remaining,
        rateLimitRemaining: result.rateLimitRemaining ?? result.rateLimit?.remaining,
        rateLimitTotal: result.rateLimitTotal ?? result.rateLimit?.total,
        rateLimitResetAt: result.rateLimitResetAt ?? result.rateLimit?.resetAt
      },
      message: `Account status: **${result.creditsRemaining ?? result.credits ?? result.remaining ?? 'N/A'}** credits remaining.`
    };
  })
  .build();
