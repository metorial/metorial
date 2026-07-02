import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let createSubscription = SlateTool.create(spec, {
  name: 'Create Subscription',
  key: 'create_subscription',
  description: `Create a new PayPal subscription for a billing plan. Returns an approval URL for the subscriber to activate. The billing plan must already exist.`,
  instructions: [
    'A billing plan must be created first using **Manage Billing Plan**.',
    'The subscriber must approve the subscription via the returned approval URL.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      planId: z.string().describe('Billing plan ID to subscribe to'),
      subscriberEmail: z.string().optional().describe('Subscriber email address'),
      subscriberFirstName: z.string().optional().describe('Subscriber first name'),
      subscriberLastName: z.string().optional().describe('Subscriber last name'),
      startTime: z
        .string()
        .optional()
        .describe('Subscription start time in ISO 8601 format. Defaults to now.'),
      customId: z
        .string()
        .optional()
        .describe('Custom ID to track the subscription in your system'),
      returnUrl: z.string().optional().describe('URL to redirect subscriber after approval'),
      cancelUrl: z
        .string()
        .optional()
        .describe('URL to redirect subscriber after cancellation')
    })
  )
  .output(
    z.object({
      subscriptionId: z.string().describe('PayPal subscription ID'),
      status: z.string().describe('Subscription status'),
      approvalUrl: z.string().optional().describe('URL for subscriber to approve'),
      planId: z.string().optional().describe('Associated plan ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let subscriber: Record<string, any> | undefined;
    if (
      ctx.input.subscriberEmail ||
      ctx.input.subscriberFirstName ||
      ctx.input.subscriberLastName
    ) {
      subscriber = {};
      if (ctx.input.subscriberEmail) subscriber.email_address = ctx.input.subscriberEmail;
      if (ctx.input.subscriberFirstName || ctx.input.subscriberLastName) {
        subscriber.name = {};
        if (ctx.input.subscriberFirstName)
          subscriber.name.given_name = ctx.input.subscriberFirstName;
        if (ctx.input.subscriberLastName)
          subscriber.name.surname = ctx.input.subscriberLastName;
      }
    }

    let applicationContext: Record<string, any> | undefined;
    if (ctx.input.returnUrl || ctx.input.cancelUrl) {
      applicationContext = {
        brand_name: 'PayPal Subscription',
        user_action: 'SUBSCRIBE_NOW'
      };
      if (ctx.input.returnUrl) applicationContext.return_url = ctx.input.returnUrl;
      if (ctx.input.cancelUrl) applicationContext.cancel_url = ctx.input.cancelUrl;
    }

    let result = await client.createSubscription({
      planId: ctx.input.planId,
      startTime: ctx.input.startTime,
      subscriber,
      applicationContext,
      customId: ctx.input.customId
    });

    let links = (result.links || []) as Array<{ href: string; rel: string }>;
    let approvalLink = links.find(l => l.rel === 'approve');

    return {
      output: {
        subscriptionId: result.id,
        status: result.status,
        approvalUrl: approvalLink?.href,
        planId: ctx.input.planId
      },
      message: `Subscription \`${result.id}\` created with status **${result.status}**. ${approvalLink ? `Approval URL: ${approvalLink.href}` : ''}`
    };
  })
  .build();
