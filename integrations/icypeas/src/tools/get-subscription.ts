import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description: `Retrieve your Icypeas subscription information including remaining credits and plan details. Requires the account email address (configured in authentication or provided as input).`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe(
          'Account email address. If not provided, uses the email from authentication settings.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request succeeded'),
      subscription: z.any().optional().describe('Subscription details'),
      credits: z.any().optional().describe('Credits information'),
      userId: z.string().optional().describe('Your Icypeas user ID'),
      raw: z.any().optional().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let email = ctx.input.email || ctx.auth.accountEmail;
    if (!email) {
      throw new Error(
        'Account email is required. Provide it as input or configure it in authentication settings.'
      );
    }

    let result = await client.getSubscriptionInfo(email);

    return {
      output: {
        success: result?.success ?? true,
        subscription: result?.subscription,
        credits: result?.credits,
        userId: result?.userId || result?._id,
        raw: result
      },
      message: `Subscription info retrieved.${result?.credits !== undefined ? ` Remaining credits: **${result.credits}**` : ''}`
    };
  })
  .build();
