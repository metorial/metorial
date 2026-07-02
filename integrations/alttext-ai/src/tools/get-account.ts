import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account information including plan details, credit usage, and billing period. Useful for checking remaining credits before processing images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      displayName: z.string().describe('Account display name'),
      email: z.string().describe('Account email address'),
      plan: z.string().describe('Current subscription plan'),
      creditsUsed: z.number().describe('Credits used in the current billing period'),
      creditsRemaining: z.number().describe('Credits remaining in the current billing period'),
      creditsLimit: z.number().describe('Total credit limit for the billing period'),
      billingPeriodStart: z.string().describe('Start date of the current billing period'),
      billingPeriodEnd: z.string().describe('End date of the current billing period')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();

    return {
      output: {
        displayName: account.display_name,
        email: account.email,
        plan: account.plan,
        creditsUsed: account.credits_used,
        creditsRemaining: account.credits_remaining,
        creditsLimit: account.credits_limit,
        billingPeriodStart: account.billing_period_start,
        billingPeriodEnd: account.billing_period_end
      },
      message: `Account **${account.display_name}** on **${account.plan}** plan — ${account.credits_remaining} credits remaining (${account.credits_used}/${account.credits_limit} used).`
    };
  })
  .build();
