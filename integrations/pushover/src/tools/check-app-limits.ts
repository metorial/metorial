import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let checkAppLimits = SlateTool.create(spec, {
  name: 'Check App Limits',
  key: 'check_app_limits',
  description: `Check the current monthly message usage and limits for the application. Returns the total message quota, remaining messages, and when the limit resets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      monthlyLimit: z.number().describe('Total monthly message quota'),
      remaining: z.number().describe('Messages remaining this month'),
      resetAt: z.number().describe('Unix timestamp when the monthly limit resets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result = await client.getAppLimits();

    return {
      output: {
        monthlyLimit: result.limit,
        remaining: result.remaining,
        resetAt: result.reset
      },
      message: `**${result.remaining}** of **${result.limit}** messages remaining this month.`
    };
  })
  .build();
