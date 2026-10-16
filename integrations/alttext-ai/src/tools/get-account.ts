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
      email: z.string().optional().describe('Account email address'),
      plan: z.string().optional().describe('Current subscription plan'),
      creditsUsed: z.number().describe('Credits used in the current billing period'),
      creditsRemaining: z.number().describe('Credits remaining in the current billing period'),
      creditsLimit: z.number().describe('Total credit limit for the billing period'),
      billingPeriodStart: z
        .string()
        .optional()
        .describe('Start date of the current billing period'),
      billingPeriodEnd: z
        .string()
        .optional()
        .describe('Subscription renewal or expiration date, when a subscription exists'),
      notificationEmail: z
        .string()
        .nullable()
        .optional()
        .describe('Account notification email; this is not an identity email'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider account record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();

    return {
      output: {
        displayName: account.name,
        email: typeof account.email === 'string' ? account.email : undefined,
        plan: account.subscription?.plan_name,
        creditsUsed: account.usage,
        creditsRemaining: account.usage_limit - account.usage,
        creditsLimit: account.usage_limit,
        billingPeriodStart:
          typeof account.billing_period_start === 'string'
            ? account.billing_period_start
            : undefined,
        billingPeriodEnd: account.subscription?.expires_at,
        notificationEmail: account.notification_email,
        raw: account
      },
      message: `Account **${account.name}**: ${account.usage_limit - account.usage} credits remaining (${account.usage}/${account.usage_limit} used).`
    };
  })
  .build();
