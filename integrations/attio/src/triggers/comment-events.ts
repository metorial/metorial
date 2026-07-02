import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

let COMMENT_EVENT_TYPES = [
  'comment.created',
  'comment.resolved',
  'comment.unresolved',
  'comment.deleted'
] as const;

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description: 'Triggers when comments are created, resolved, unresolved, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of comment event'),
      eventId: z.string().describe('Unique event identifier'),
      commentId: z.string().describe('The comment ID'),
      threadId: z.string().optional().describe('The thread ID'),
      objectId: z.string().optional().describe('Object ID of the record'),
      recordId: z.string().optional().describe('Record ID the comment is on'),
      listId: z.string().optional().describe('List ID (for entry-level comments)'),
      entryId: z.string().optional().describe('Entry ID (for entry-level comments)'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('The comment ID'),
      threadId: z.string().optional().describe('The thread ID'),
      objectId: z.string().optional().describe('Object ID of the record'),
      recordId: z.string().optional().describe('Record ID the comment is on'),
      listId: z.string().optional().describe('List ID (for entry-level comments)'),
      entryId: z.string().optional().describe('Entry ID (for entry-level comments)'),
      actorType: z.string().optional().describe('Type of actor that triggered the event'),
      actorId: z.string().optional().describe('ID of the actor that triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        COMMENT_EVENT_TYPES.map(eventType => ({ eventType }))
      );

      return {
        registrationDetails: {
          webhookId: webhook.id?.webhook_id ?? webhook.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AttioClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let events = body.events ?? [];

      let inputs = events
        .filter((e: any) => COMMENT_EVENT_TYPES.includes(e.event_type))
        .map((e: any) => ({
          eventType: e.event_type,
          eventId: e.id?.event_id ?? `${e.event_type}-${e.id?.comment_id}-${Date.now()}`,
          commentId: e.id?.comment_id ?? '',
          threadId: e.id?.thread_id,
          objectId: e.id?.object_id,
          recordId: e.id?.record_id,
          listId: e.id?.list_id,
          entryId: e.id?.entry_id,
          actorType: e.actor?.type,
          actorId: e.actor?.id
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          commentId: ctx.input.commentId,
          threadId: ctx.input.threadId,
          objectId: ctx.input.objectId,
          recordId: ctx.input.recordId,
          listId: ctx.input.listId,
          entryId: ctx.input.entryId,
          actorType: ctx.input.actorType,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
