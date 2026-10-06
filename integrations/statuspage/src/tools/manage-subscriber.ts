import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageIdSchema } from '../lib/validation';
import { spec } from '../spec';

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  tags: { readOnly: false, destructive: true },
  description: `Create, inspect, or unsubscribe a subscriber on the status page.
- To **create**: provide the subscriber \`type\` and the relevant contact info (email, phone, webhookEndpoint, etc.). Optionally scope to specific components.
- To **unsubscribe**: provide \`subscriberId\` and set \`unsubscribe\` to true.
- To **inspect**: provide \`subscriberId\` without an action flag. The legacy resubscribe flag is unsupported by the current API.
Creation and unsubscription can notify the contact. Confirmation suppression applies only to paid pages; trial pages still send confirmations.`,
  instructions: [
    'For email subscribers, provide "email" in the type field and the emailAddress.',
    'For SMS subscribers, provide "sms" in the type field and the phoneNumber with country code.',
    'For webhook subscribers, provide "webhook" in the type field and the webhookEndpoint URL.'
  ]
})
  .input(
    z.object({
      pageId: pageIdSchema,
      subscriberId: z
        .string()
        .optional()
        .describe('ID of an existing subscriber to inspect or unsubscribe'),
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
      skipUnsubscriptionNotification: z
        .boolean()
        .optional()
        .describe('Suppress the unsubscription notification when deleting a subscriber.'),
      unsubscribe: z
        .boolean()
        .optional()
        .describe('Set to true to unsubscribe the subscriber'),
      resubscribe: z
        .boolean()
        .optional()
        .describe(
          'Legacy flag; unsubscribed subscribers cannot be restored through the current API.'
        )
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
        .describe('Communication mode, such as email, sms, or webhook'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      unsubscribed: z.boolean().optional().describe('Whether the subscriber was unsubscribed'),
      resubscribed: z.boolean().optional().describe('Whether the subscriber was reactivated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.input.pageId ?? ctx.config.pageId
    });

    if (ctx.input.unsubscribe && ctx.input.resubscribe)
      throw createApiServiceError('Choose unsubscribe or resubscribe, not both.');
    if ((ctx.input.unsubscribe || ctx.input.resubscribe) && !ctx.input.subscriberId)
      throw createApiServiceError('subscriberId is required for a subscriber action.');
    if (ctx.input.resubscribe)
      throw createApiServiceError(
        'The current Statuspage API cannot restore an unsubscribed subscriber. Create a new subscription with an authorized contact instead; quarantine reactivation is a different operation.'
      );
    if (ctx.input.unsubscribe && ctx.input.subscriberId) {
      await client.unsubscribeSubscriber(
        ctx.input.subscriberId,
        ctx.input.skipUnsubscriptionNotification
      );
      return {
        output: { subscriberId: ctx.input.subscriberId, unsubscribed: true },
        message: `Unsubscribed subscriber \`${ctx.input.subscriberId}\`.`
      };
    }
    if (ctx.input.subscriberId) {
      const sub = await client.getSubscriber(ctx.input.subscriberId);
      return {
        output: {
          subscriberId: sub.id,
          type: sub.type ?? sub.mode,
          mode: sub.mode,
          emailAddress: sub.email,
          phoneNumber: sub.phone_number,
          webhookEndpoint: sub.endpoint,
          createdAt: sub.created_at
        },
        message: `Retrieved subscriber \`${sub.id}\`.`
      };
    }
    const type =
      ctx.input.type ??
      (ctx.input.webhookEndpoint
        ? 'webhook'
        : ctx.input.phoneNumber
          ? 'sms'
          : ctx.input.emailAddress
            ? 'email'
            : undefined);
    if (!type || !['email', 'sms', 'webhook'].includes(type))
      throw createApiServiceError(
        'Create email, sms or webhook subscriptions with this API. Slack, Teams and integration-partner subscriptions require their product setup flows.'
      );
    if (
      type === 'sms'
        ? !ctx.input.phoneNumber ||
          !ctx.input.phoneCountry ||
          ctx.input.emailAddress !== undefined ||
          ctx.input.webhookEndpoint !== undefined
        : !ctx.input.emailAddress ||
          ctx.input.phoneNumber !== undefined ||
          ctx.input.phoneCountry !== undefined ||
          (type === 'webhook'
            ? !ctx.input.webhookEndpoint
            : ctx.input.webhookEndpoint !== undefined)
    )
      throw createApiServiceError(
        'Provide only the contact fields matching the subscription type: email; phoneNumber and phoneCountry; or emailAddress and webhookEndpoint.'
      );
    if (ctx.input.componentIds?.length === 0)
      throw createApiServiceError(
        'componentIds must contain at least one component when supplied. Omit it for page-wide subscriptions.'
      );
    let data: Record<string, unknown> = {};
    if (ctx.input.emailAddress) data.email = ctx.input.emailAddress;
    if (ctx.input.phoneNumber) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.phoneCountry) data.phone_country = ctx.input.phoneCountry;
    if (ctx.input.webhookEndpoint) data.endpoint = ctx.input.webhookEndpoint;
    if (ctx.input.componentIds) data.component_ids = ctx.input.componentIds;
    if (ctx.input.skipConfirmationNotification !== undefined)
      data.skip_confirmation_notification = ctx.input.skipConfirmationNotification;

    let sub = await client.createSubscriber(data);

    return {
      output: {
        subscriberId: sub.id,
        type: sub.type ?? sub.mode,
        emailAddress: sub.email,
        phoneNumber: sub.phone_number,
        webhookEndpoint: sub.endpoint,
        mode: sub.mode,
        createdAt: sub.created_at
      },
      message: `Created ${sub.type ?? sub.mode} subscriber \`${sub.id}\`.`
    };
  })
  .build();
