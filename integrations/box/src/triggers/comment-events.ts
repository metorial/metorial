import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentEventTypes = ['COMMENT.CREATED', 'COMMENT.UPDATED', 'COMMENT.DELETED'] as const;

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description: 'Triggers when comments are created, updated, or deleted on Box files.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Box webhook event type (e.g. COMMENT.CREATED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The comment object from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the comment'),
      commentMessage: z.string().optional().describe('Comment message text'),
      itemType: z.string().optional().describe('Type of the item the comment is on'),
      itemId: z.string().optional().describe('ID of the item the comment is on'),
      itemName: z.string().optional().describe('Name of the item the comment is on'),
      createdByUserId: z.string().optional().describe('ID of the comment author'),
      createdByUserName: z.string().optional().describe('Name of the comment author'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook('folder', '0', ctx.input.webhookBaseUrl, [
        ...commentEventTypes
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
        id: `${ctx.input.webhookId}-${source.id || ''}-${ctx.input.triggeredAt}`,
        output: {
          commentId: source.id || '',
          commentMessage: source.message,
          itemType: source.item?.type,
          itemId: source.item?.id,
          itemName: source.item?.name,
          createdByUserId: triggeredBy.id || source.created_by?.id,
          createdByUserName: triggeredBy.name || source.created_by?.name,
          triggeredAt: ctx.input.triggeredAt
        }
      };
    }
  });
