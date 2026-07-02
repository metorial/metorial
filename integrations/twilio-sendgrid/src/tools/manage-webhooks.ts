import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { twilioSendGridServiceError } from '../lib/errors';
import { spec } from '../spec';

let eventTypeValues = [
  'processed',
  'dropped',
  'delivered',
  'deferred',
  'bounce',
  'open',
  'click',
  'spam_report',
  'unsubscribe',
  'group_unsubscribe',
  'group_resubscribe',
  'account_status_change'
] as const;

type EventType = (typeof eventTypeValues)[number];

let eventWebhookSchema = z.object({
  webhookId: z.string().optional().describe('Event Webhook ID'),
  enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
  url: z.string().optional().describe('Destination URL'),
  friendlyName: z.string().optional().describe('Webhook friendly name'),
  selectedEvents: z.array(z.string()).describe('Subscribed event types'),
  signatureVerificationEnabled: z
    .boolean()
    .optional()
    .describe('Whether signed Event Webhook verification is enabled'),
  createdDate: z.string().optional().describe('Creation timestamp'),
  updatedDate: z.string().optional().describe('Last update timestamp')
});

let selectedEventsFor = (webhook: Record<string, any>) =>
  eventTypeValues.filter(event => webhook[event] === true);

let mapWebhook = (webhook: any, fallbackWebhookId?: string) => {
  let value = webhook || {};
  return {
    webhookId: value.id || fallbackWebhookId || undefined,
    enabled: value.enabled ?? undefined,
    url: value.url || undefined,
    friendlyName: value.friendly_name || undefined,
    selectedEvents: selectedEventsFor(value),
    signatureVerificationEnabled: value.signature_verification_enabled ?? undefined,
    createdDate: value.created_date || undefined,
    updatedDate: value.updated_date || undefined
  };
};

let toClientEventField = (event: EventType) => {
  if (event === 'spam_report') return 'spamReport';
  if (event === 'group_unsubscribe') return 'groupUnsubscribe';
  if (event === 'group_resubscribe') return 'groupResubscribe';
  if (event === 'account_status_change') return 'accountStatusChange';
  return event;
};

let eventSettingsFor = (events?: EventType[]) => {
  let settings: Record<string, boolean> = {};
  if (!events) {
    return settings;
  }

  for (let event of eventTypeValues) {
    settings[toClientEventField(event)] = events.includes(event);
  }

  return settings;
};

export let manageEventWebhooks = SlateTool.create(spec, {
  name: 'Manage Event Webhooks',
  key: 'manage_event_webhooks',
  description: `List, create, retrieve, update, delete, or toggle signature verification for SendGrid Event Webhook configurations. Event Webhooks deliver near real-time delivery and engagement events to HTTPS endpoints.`,
  instructions: [
    'For action "create", provide url and at least one event.',
    'For actions "get", "update", "delete", and "toggle_signature", provide webhookId.',
    'For action "toggle_signature", provide signatureVerificationEnabled.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete', 'toggle_signature'])
        .describe('Webhook operation to perform'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID. Required for get, update, delete, and toggle_signature.'),
      url: z.string().optional().describe('HTTPS destination URL for Event Webhook posts'),
      enabled: z.boolean().optional().describe('Whether the webhook should be enabled'),
      friendlyName: z.string().optional().describe('Friendly name for the webhook'),
      events: z
        .array(z.enum(eventTypeValues))
        .optional()
        .describe('Event types to subscribe to for create or update'),
      includeAccountStatusChange: z
        .boolean()
        .optional()
        .describe('Include account_status_change in list/get responses when available'),
      signatureVerificationEnabled: z
        .boolean()
        .optional()
        .describe('Whether signed Event Webhook verification should be enabled'),
      oauthClientId: z.string().optional().describe('OAuth client ID for OAuth verification'),
      oauthClientSecret: z
        .string()
        .optional()
        .describe('OAuth client secret for OAuth verification'),
      oauthTokenUrl: z.string().optional().describe('OAuth token URL for OAuth verification')
    })
  )
  .output(
    z.object({
      webhooks: z.array(eventWebhookSchema).describe('Webhook configurations'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listEventWebhooks(ctx.input.includeAccountStatusChange);
        let rawWebhooks: any[] = Array.isArray(result)
          ? result
          : Array.isArray(result.webhooks)
            ? result.webhooks
            : [];
        let webhooks = rawWebhooks.map(webhook => mapWebhook(webhook));
        return {
          output: { webhooks, success: true },
          message: `Retrieved **${webhooks.length}** Event Webhook configuration(s).`
        };
      }
      case 'create': {
        if (!ctx.input.url) {
          throw twilioSendGridServiceError('url is required to create an Event Webhook.');
        }
        if (!ctx.input.events || ctx.input.events.length === 0) {
          throw twilioSendGridServiceError(
            'events must include at least one event to create an Event Webhook.'
          );
        }
        let webhook = await client.createEventWebhook({
          enabled: ctx.input.enabled ?? true,
          url: ctx.input.url,
          friendlyName: ctx.input.friendlyName,
          ...eventSettingsFor(ctx.input.events),
          oauthClientId: ctx.input.oauthClientId,
          oauthClientSecret: ctx.input.oauthClientSecret,
          oauthTokenUrl: ctx.input.oauthTokenUrl
        });
        let mappedWebhook = mapWebhook(webhook);
        return {
          output: { webhooks: [mappedWebhook], success: true },
          message: `Created Event Webhook${mappedWebhook.webhookId ? ` ${mappedWebhook.webhookId}` : ''}.`
        };
      }
      case 'get': {
        if (!ctx.input.webhookId) {
          throw twilioSendGridServiceError('webhookId is required to get an Event Webhook.');
        }
        let webhook = await client.getEventWebhook(
          ctx.input.webhookId,
          ctx.input.includeAccountStatusChange
        );
        return {
          output: { webhooks: [mapWebhook(webhook, ctx.input.webhookId)], success: true },
          message: `Retrieved Event Webhook ${ctx.input.webhookId}.`
        };
      }
      case 'update': {
        if (!ctx.input.webhookId) {
          throw twilioSendGridServiceError(
            'webhookId is required to update an Event Webhook.'
          );
        }
        if (
          ctx.input.url === undefined &&
          ctx.input.enabled === undefined &&
          ctx.input.friendlyName === undefined &&
          ctx.input.events === undefined &&
          ctx.input.oauthClientId === undefined &&
          ctx.input.oauthClientSecret === undefined &&
          ctx.input.oauthTokenUrl === undefined
        ) {
          throw twilioSendGridServiceError(
            'Provide at least one field to update an Event Webhook.'
          );
        }
        let webhook = await client.updateEventWebhookSettings(ctx.input.webhookId, {
          enabled: ctx.input.enabled,
          url: ctx.input.url,
          friendlyName: ctx.input.friendlyName,
          ...eventSettingsFor(ctx.input.events),
          oauthClientId: ctx.input.oauthClientId,
          oauthClientSecret: ctx.input.oauthClientSecret,
          oauthTokenUrl: ctx.input.oauthTokenUrl
        });
        return {
          output: { webhooks: [mapWebhook(webhook, ctx.input.webhookId)], success: true },
          message: `Updated Event Webhook ${ctx.input.webhookId}.`
        };
      }
      case 'delete': {
        if (!ctx.input.webhookId) {
          throw twilioSendGridServiceError(
            'webhookId is required to delete an Event Webhook.'
          );
        }
        await client.deleteEventWebhook(ctx.input.webhookId);
        return {
          output: { webhooks: [], success: true },
          message: `Deleted Event Webhook ${ctx.input.webhookId}.`
        };
      }
      case 'toggle_signature': {
        if (!ctx.input.webhookId) {
          throw twilioSendGridServiceError(
            'webhookId is required to toggle Event Webhook signature verification.'
          );
        }
        if (ctx.input.signatureVerificationEnabled === undefined) {
          throw twilioSendGridServiceError(
            'signatureVerificationEnabled is required for toggle_signature.'
          );
        }
        let webhook = await client.toggleEventWebhookSignatureVerification(
          ctx.input.webhookId,
          ctx.input.signatureVerificationEnabled
        );
        return {
          output: { webhooks: [mapWebhook(webhook, ctx.input.webhookId)], success: true },
          message: `Updated signature verification for Event Webhook ${ctx.input.webhookId}.`
        };
      }
    }
  })
  .build();
