import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve information about the connected OpsGenie account, including its name, user count, and subscription plan. Useful to confirm which account the API key belongs to.`,
  constraints: ['Requires an API key with configuration access.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().describe('Account name'),
      userCount: z.number().optional().describe('Number of users in the account'),
      plan: z
        .object({
          name: z
            .string()
            .optional()
            .describe('Plan name (e.g., Essentials, Standard, Enterprise)'),
          maxUserCount: z.number().optional().describe('Maximum users allowed by the plan'),
          isYearly: z.boolean().optional().describe('Whether the plan is billed yearly')
        })
        .optional()
        .describe('Subscription plan')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let account = (await client.getAccount()) ?? {};

    return {
      output: {
        name: account.name ?? '',
        userCount: account.userCount,
        plan: account.plan
          ? {
              name: account.plan.name,
              maxUserCount: account.plan.maxUserCount,
              isYearly: account.plan.isYearly
            }
          : undefined
      },
      message: `Connected to OpsGenie account **${account.name ?? 'unknown'}**${account.plan?.name ? ` (${account.plan.name} plan)` : ''}.`
    };
  })
  .build();
