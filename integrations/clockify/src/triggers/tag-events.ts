import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagEventTypes = ['NEW_TAG', 'TAG_UPDATED', 'TAG_DELETED'] as const;

let eventTypeMap: Record<string, string> = {
  NEW_TAG: 'tag.created',
  TAG_UPDATED: 'tag.updated',
  TAG_DELETED: 'tag.deleted'
};

export let tagEvents = SlateTrigger.create(spec, {
  name: 'Tag Events',
  key: 'tag_events',
  description: 'Triggered when tags are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      tag: z.any().describe('Tag data from webhook payload')
    })
  )
  .output(
    z.object({
      tagId: z.string(),
      name: z.string().optional(),
      archived: z.boolean().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of tagEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            tag: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let tag = ctx.input.tag;
      let tagId = tag.id || tag.tagId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `tag.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${tagId}_${tag.changeDate || Date.now()}`,
        output: {
          tagId,
          name: tag.name || undefined,
          archived: tag.archived,
          workspaceId: tag.workspaceId || undefined
        }
      };
    }
  })
  .build();
