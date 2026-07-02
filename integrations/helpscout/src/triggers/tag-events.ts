import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let TAG_EVENTS = ['tag.created', 'tag.updated', 'tag.deleted'] as const;

export let tagEvents = SlateTrigger.create(spec, {
  name: 'Tag Events',
  key: 'tag_events',
  description: 'Triggered when tags are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Help Scout event type'),
      tagId: z.number().describe('Tag ID'),
      tagName: z.string().nullable().describe('Tag name'),
      webhookId: z.string().describe('Webhook delivery identifier')
    })
  )
  .output(
    z.object({
      tagId: z.number().describe('Tag ID'),
      tagName: z.string().nullable().describe('Tag name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let secret = crypto.randomUUID();
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...TAG_EVENTS],
        secret,
        payloadVersion: 'V2'
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(Number(webhookId));
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;
      let eventType = data?.event ?? data?.eventType ?? '';
      let tag = data?.payload?.tag ?? data?.tag ?? data ?? {};

      let tagId = tag.id ?? 0;
      let tagName = tag.name ?? tag.tag ?? null;

      let webhookId = `${eventType}-${tagId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            tagId,
            tagName,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'tag.created': 'tag.created',
        'tag.updated': 'tag.updated',
        'tag.deleted': 'tag.deleted'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `tag.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: {
          tagId: ctx.input.tagId,
          tagName: ctx.input.tagName
        }
      };
    }
  })
  .build();
