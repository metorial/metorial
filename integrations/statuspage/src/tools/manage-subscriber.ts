import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  description: `Create, unsubscribe, or reactivate a subscriber on the status page.
- To **create**: provide the subscriber \`type\` and the relevant contact info (email, phone, webhookEndpoint, etc.). Optionally scope to specific components.
- To **unsubscribe**: provide \`subscriberId\` and set \`unsubscribe\` to true.
- To **reactivate**: provide \`subscriberId\` and set \`resubscribe\` to true.`,
  instructions: [
    'For email subscribers, provide "email" in the type field and the emailAddress.',
    'For SMS subscribers, provide "sms" in the type field and the phoneNumber with country code.',
    'For webhook subscribers, provide "webhook" in the type field and the webhookEndpoint URL.'
  ]
})
  .input(
    z.object({
      subscriberId: z
        .string()
        .optional()
        .describe('ID of an existing subscriber (for unsubscribe or resubscribe)'),
      type: z
        .enum(['email', 'sms', 'webhook', 'slack', 'teams', 'integration_partner'])
        .optional()
        .describe('Type of subscriber to create'),
      emailAddress: z.string().optional().describe('Email address for email subscribers'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number with country code for SMS subscribers'),
      phoneCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for the phone number'),
      webhookEndpoint: z.string().optional().describe('Endpoint URL for webhook subscribers'),
      componentIds: z
        .array(z.string())
        .optional()
        .describe('List of component IDs to subscribe to. Omit for page-wide subscription.'),
      skipConfirmationNotification: z
        .boolean()
        .optional()
        .describe('Skip sending the confirmation notification to the subscriber'),
      unsubscribe: z
        .boolean()
        .optional()
        .describe('Set to true to unsubscribe the subscriber'),
      resubscribe: z
        .boolean()
        .optional()
        .describe('Set to true to reactivate a previously unsubscribed subscriber')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Unique identifier of the subscriber'),
      type: z.string().optional().describe('Type of the subscriber'),
      emailAddress: z.string().optional().nullable().describe('Email of the subscriber'),
      phoneNumber: z.string().optional().nullable().describe('Phone number of the subscriber'),
      webhookEndpoint: z.string().optional().nullable().describe('Webhook endpoint'),
      mode: z
        .string()
        .optional()
        .describe('Subscription mode (e.g. all or specific components)'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      unsubscribed: z.boolean().optional().describe('Whether the subscriber was unsubscribed'),
      resubscribed: z.boolean().optional().describe('Whether the subscriber was reactivated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    if (ctx.input.unsubscribe && ctx.input.subscriberId) {
      await client.unsubscribeSubscriber(ctx.input.subscriberId);
      return {
        output: { subscriberId: ctx.input.subscriberId, unsubscribed: true },
        message: `Unsubscribed subscriber \`${ctx.input.subscriberId}\`.`
      };
    }

    if (ctx.input.resubscribe && ctx.input.subscriberId) {
      let sub = await client.resubscribeSubscriber(ctx.input.subscriberId);
      return {
        output: {
          subscriberId: sub.id,
          type: sub.type,
          emailAddress: sub.email,
          phoneNumber: sub.phone_number,
          webhookEndpoint: sub.endpoint,
          mode: sub.mode,
          createdAt: sub.created_at,
          resubscribed: true
        },
        message: `Reactivated subscriber \`${sub.id}\`.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.type) data.type = ctx.input.type;
    if (ctx.input.emailAddress) data.email = ctx.input.emailAddress;
    if (ctx.input.phoneNumber) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.phoneCountry) data.phone_country = ctx.input.phoneCountry;
    if (ctx.input.webhookEndpoint) data.endpoint = ctx.input.webhookEndpoint;
    if (ctx.input.componentIds) data.component_ids = ctx.input.componentIds;
    if (ctx.input.skipConfirmationNotification)
      data.skip_confirmation_notification = ctx.input.skipConfirmationNotification;

    let sub = await client.createSubscriber(data);

    return {
      output: {
        subscriberId: sub.id,
        type: sub.type,
        emailAddress: sub.email,
        phoneNumber: sub.phone_number,
        webhookEndpoint: sub.endpoint,
        mode: sub.mode,
        createdAt: sub.created_at
      },
      message: `Created ${sub.type} subscriber \`${sub.id}\`.`
    };
  })
  .build();
