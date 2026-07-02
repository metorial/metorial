import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let metadataEventTypes = [
  'METADATA_INSTANCE.CREATED',
  'METADATA_INSTANCE.UPDATED',
  'METADATA_INSTANCE.DELETED'
] as const;

export let metadataEvents = SlateTrigger.create(spec, {
  name: 'Metadata Events',
  key: 'metadata_events',
  description:
    'Triggers when metadata instances are created, updated, or deleted on Box files or folders.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The Box webhook event type (e.g. METADATA_INSTANCE.CREATED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The metadata instance object from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the item the metadata is on'),
      itemType: z.string().optional().describe('Type of the item (file or folder)'),
      itemName: z.string().optional().describe('Name of the item'),
      templateKey: z.string().optional().describe('Metadata template key'),
      scope: z.string().optional().describe('Metadata template scope'),
      triggeredByUserId: z
        .string()
        .optional()
        .describe('ID of the user who triggered the event'),
      triggeredByUserName: z
        .string()
        .optional()
        .describe('Name of the user who triggered the event'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook('folder', '0', ctx.input.webhookBaseUrl, [
        ...metadataEventTypes
      ]);
      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            eventType: data.trigger,
            webhookId: data.webhook?.id || '',
            triggeredAt: data.created_at || new Date().toISOString(),
            source: data.source,
            triggeredBy: data.created_by
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let source = ctx.input.source || {};
      let triggeredBy = ctx.input.triggeredBy || {};
      let eventType = ctx.input.eventType.toLowerCase().replace('.', '.');

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${source.id || source.item?.id || ''}-${ctx.input.triggeredAt}`,
        output: {
          itemId: source.item?.id || source.id || '',
          itemType: source.item?.type || source.type,
          itemName: source.item?.name || source.name,
          templateKey: source.$template || source.templateKey,
          scope: source.$scope || source.scope,
          triggeredByUserId: triggeredBy.id,
          triggeredByUserName: triggeredBy.name,
          triggeredAt: ctx.input.triggeredAt
        }
      };
    }
  });
