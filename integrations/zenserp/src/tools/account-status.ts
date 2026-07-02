import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountStatusSchema = z
  .object({
    remainingRequests: z.number().optional().describe('Number of API requests remaining'),
    planName: z.string().optional().describe('Current subscription plan name'),
    totalRequests: z.number().optional().describe('Total requests allowed per billing period')
  })
  .passthrough();

export let accountStatus = SlateTool.create(spec, {
  name: 'Account Status',
  key: 'account_status',
  description: `Check the current Zenserp account status including remaining API requests and subscription plan details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(accountStatusSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getStatus();

    let remaining = results.remaining_requests ?? results.remaining ?? 'unknown';

    return {
      output: {
        remainingRequests: results.remaining_requests ?? results.remaining,
        planName: results.plan ?? results.plan_name,
        totalRequests: results.total_requests ?? results.total,
        ...results
      },
      message: `Account has **${remaining}** remaining API requests.`
    };
  })
  .build();
