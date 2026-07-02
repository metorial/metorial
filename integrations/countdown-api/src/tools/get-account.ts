import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve account usage information and platform status. Returns plan details, credit usage and remaining balance, collection and destination limits, platform component status, and 3-month usage history broken down by day.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      plan: z.string().optional().describe('Current plan name.'),
      creditsUsed: z.number().optional().describe('Credits used this billing period.'),
      creditsLimit: z
        .number()
        .optional()
        .describe('Total credit limit for the billing period.'),
      creditsRemaining: z
        .number()
        .optional()
        .describe('Credits remaining in the billing period.'),
      creditsResetAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of when credits reset.'),
      collectionsUsed: z.number().optional().describe('Number of collections in use.'),
      collectionsLimit: z.number().optional().describe('Maximum allowed collections.'),
      destinationsUsed: z.number().optional().describe('Number of destinations in use.'),
      destinationsLimit: z.number().optional().describe('Maximum allowed destinations.'),
      platformStatus: z.array(z.any()).optional().describe('Platform component status.'),
      usageHistory: z
        .array(z.any())
        .optional()
        .describe('3-month usage history broken down by day.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });

    let result = await client.getAccount();
    let account = result.account_info || {};

    return {
      output: {
        plan: account.plan,
        creditsUsed: account.credits_used,
        creditsLimit: account.credits_limit,
        creditsRemaining: account.credits_remaining,
        creditsResetAt: account.credits_reset_at,
        collectionsUsed: account.collections_used,
        collectionsLimit: account.collections_limit,
        destinationsUsed: account.destinations_used,
        destinationsLimit: account.destinations_limit,
        platformStatus: account.status,
        usageHistory: account.usage_history
      },
      message: `**${account.plan || 'Unknown'}** plan — **${account.credits_remaining ?? '?'}** credits remaining of ${account.credits_limit ?? '?'} (${account.credits_used ?? '?'} used). Collections: ${account.collections_used ?? '?'}/${account.collections_limit ?? '?'}. Destinations: ${account.destinations_used ?? '?'}/${account.destinations_limit ?? '?'}.`
    };
  })
  .build();
