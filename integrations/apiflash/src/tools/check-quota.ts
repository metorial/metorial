import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkQuota = SlateTool.create(spec, {
  name: 'Check Quota',
  key: 'check_quota',
  description: `Check the current API quota usage for your ApiFlash account.
Returns the total quota limit, remaining credits, and the timestamp when the quota resets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      quotaLimit: z
        .number()
        .describe('Maximum number of API calls allowed per billing period'),
      quotaRemaining: z
        .number()
        .describe('Number of API calls remaining in the current billing period'),
      quotaResetTimestamp: z.number().describe('UTC epoch timestamp when the quota resets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let quota = await client.getQuota();

    let resetDate = new Date(quota.reset * 1000).toISOString();

    return {
      output: {
        quotaLimit: quota.limit,
        quotaRemaining: quota.remaining,
        quotaResetTimestamp: quota.reset
      },
      message: `Quota: **${quota.remaining}** / **${quota.limit}** remaining. Resets at ${resetDate}.`
    };
  })
  .build();
