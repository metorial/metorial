import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventWebhookSchema = z.object({
  webhookId: z.string().optional().describe('Event webhook ID'),
  enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
  url: z.string().optional().describe('Webhook destination URL'),
  friendlyName: z.string().optional().describe('Webhook friendly name'),
  createdDate: z.string().optional().describe('Webhook creation timestamp'),
  updatedDate: z.string().optional().describe('Webhook update timestamp'),
  selectedEvents: z
    .array(z.string())
    .describe('Event types enabled for this webhook configuration'),
  signatureVerificationEnabled: z
    .boolean()
    .optional()
    .describe('Whether signed event webhook verification is enabled')
});

const eventFields = [
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
];

let selectedEventsFor = (webhook: Record<string, any>) =>
  eventFields.filter(field => webhook[field] === true);

export let listEventWebhooks = SlateTool.create(spec, {
  name: 'List Event Webhooks',
  key: 'list_event_webhooks',
  description: `Retrieve configured SendGrid Event Webhooks and the delivery or engagement events each webhook subscribes to.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeAccountStatusChange: z
        .boolean()
        .optional()
        .describe('Include account_status_change in webhook response payloads when available')
    })
  )
  .output(
    z.object({
      webhooks: z.array(eventWebhookSchema).describe('Configured Event Webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listEventWebhooks(ctx.input.includeAccountStatusChange);

    let rawWebhooks = Array.isArray(result.webhooks) ? result.webhooks : [];
    let webhooks = rawWebhooks.map((webhook: any) => ({
      webhookId: webhook.id,
      enabled: webhook.enabled,
      url: webhook.url,
      friendlyName: webhook.friendly_name,
      createdDate: webhook.created_date,
      updatedDate: webhook.updated_date,
      selectedEvents: selectedEventsFor(webhook),
      signatureVerificationEnabled: webhook.signature_verification_enabled
    }));

    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** Event Webhook configuration(s).`
    };
  });
