import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let labelEventTypes = ['labels:created', 'labels:updated', 'labels:deleted'] as const;

export let labelEvents = SlateTrigger.create(spec, {
  name: 'Label Events',
  key: 'label_events',
  description: 'Triggers when labels (tags) are created, updated, or deleted in Timely.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      labelId: z.number().describe('Label ID'),
      name: z.string().nullable().describe('Label name'),
      parentId: z.number().nullable().describe('Parent label ID'),
      emoji: z.string().nullable().describe('Custom emoji'),
      active: z.boolean().nullable().describe('Whether the label is active')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: [...labelEventTypes]
      });

      return {
        registrationDetails: { webhookId: String(webhook.id) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event ?? data.event_type ?? 'labels:updated',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let label = payload.data ?? payload;

      let eventType = ctx.input.eventType;
      let typeMap: Record<string, string> = {
        'labels:created': 'label.created',
        'labels:updated': 'label.updated',
        'labels:deleted': 'label.deleted'
      };

      return {
        type: typeMap[eventType] ?? 'label.updated',
        id: `label-${label.id ?? 'unknown'}-${eventType}`,
        output: {
          labelId: label.id ?? 0,
          name: label.name ?? null,
          parentId: label.parent_id ?? null,
          emoji: label.emoji ?? null,
          active: label.active ?? null
        }
      };
    }
  })
  .build();
