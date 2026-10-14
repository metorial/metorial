import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let subscribe = SlateTool.create(spec, {
  name: 'Add Subscriber',
  key: 'subscribe',
  description: `Add a new subscriber to a specified list. Supports custom field values to store additional attributes alongside the email address. Fields are passed as a map of custom field IDs to their values.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the subscriber list to add the subscriber to'),
      emailAddress: z.string().describe('Email address of the new subscriber'),
      subscriptionIp: z
        .string()
        .optional()
        .describe('IP address of the subscriber (defaults to 127.0.0.1)'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom field values as a map of field ID to value (e.g., {"11": "John", "12": "Doe"})'
        )
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('ID of the newly subscribed subscriber'),
      success: z.boolean().describe('Whether the subscription request was successful'),
      subscriptionStatus: z
        .string()
        .optional()
        .describe('Subscription state, including pending confirmation'),
      redirectUrl: z.string().optional().describe('Provider subscription result URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || ctx.config.subdomain
    });

    let result = await client.subscribe({
      listId: ctx.input.listId,
      emailAddress: ctx.input.emailAddress,
      subscriptionIp: ctx.input.subscriptionIp,
      fields: ctx.input.fields
    });

    return {
      output: {
        subscriberId: String(result.SubscriberID || result.SubscriberId || ''),
        success: true,
        subscriptionStatus: result.SubscriptionStatus,
        redirectUrl: result.RedirectURL
      },
      message: `Subscription request accepted for **${ctx.input.emailAddress}** in list **${ctx.input.listId}** (${result.SubscriptionStatus || 'status unavailable'}).`
    };
  })
  .build();
