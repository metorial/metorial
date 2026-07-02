import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { mondayServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateEventsTrigger = SlateTrigger.create(spec, {
  name: 'Update Events',
  key: 'update_events',
  description:
    'Fires when updates (comments) are created, edited, or deleted on items or sub-items on a board.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      webhookEventId: z.string().describe('Unique event identifier'),
      boardId: z.string().describe('Board ID'),
      itemId: z.string().nullable().describe('Item ID'),
      updateId: z.string().nullable().describe('Update ID'),
      updateBody: z.string().nullable().describe('Update body content'),
      replyId: z.string().nullable().describe('Reply ID if this is a reply'),
      parentItemId: z.string().nullable().describe('Parent item ID for sub-item updates'),
      userId: z.string().nullable().describe('User who triggered the event')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('Board ID'),
      itemId: z.string().describe('Item ID'),
      updateId: z.string().nullable().describe('Update ID'),
      updateBody: z.string().nullable().describe('Update body content'),
      replyId: z.string().nullable().describe('Reply ID if this is a reply'),
      parentItemId: z.string().nullable().describe('Parent item ID for sub-item updates'),
      userId: z.string().nullable().describe('User who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MondayClient({ token: ctx.auth.token });

      let url = new URL(ctx.input.webhookBaseUrl);
      let boardId = url.searchParams.get('boardId');

      if (!boardId) {
        throw mondayServiceError(
          'Board ID is required. Configure the boardId query parameter on the webhook URL.'
        );
      }

      let eventTypes = [
        'create_update',
        'edit_update',
        'delete_update',
        'create_subitem_update'
      ];

      let registrations: Array<{ webhookId: string; eventType: string; boardId: string }> = [];

      for (let eventType of eventTypes) {
        let webhook = await client.createWebhook(
          boardId,
          `${ctx.input.webhookBaseUrl}`,
          eventType
        );
        registrations.push({
          webhookId: String(webhook.id),
          eventType,
          boardId
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new MondayClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ webhookId: string }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Handle Monday.com challenge verification
      if (body.challenge) {
        return {
          inputs: [],
          response: new Response(JSON.stringify({ challenge: body.challenge }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      let event = body.event;
      if (!event) {
        return { inputs: [] };
      }

      let eventType = event.type || body.type || 'create_update';
      let updateId = event.updateId ? String(event.updateId) : null;
      let webhookEventId = `${updateId || 'unknown'}-${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            webhookEventId,
            boardId: String(event.boardId || body.boardId || ''),
            itemId: event.pulseId
              ? String(event.pulseId)
              : event.itemId
                ? String(event.itemId)
                : null,
            updateId,
            updateBody: event.body || null,
            replyId: event.replyId ? String(event.replyId) : null,
            parentItemId: event.parentItemId ? String(event.parentItemId) : null,
            userId: event.userId ? String(event.userId) : null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        create_update: 'update.created',
        edit_update: 'update.edited',
        delete_update: 'update.deleted',
        create_subitem_update: 'subitem_update.created'
      };

      let type = eventTypeMap[ctx.input.eventType] || `update.${ctx.input.eventType}`;

      return {
        type,
        id: ctx.input.webhookEventId,
        output: {
          boardId: ctx.input.boardId,
          itemId: ctx.input.itemId || '',
          updateId: ctx.input.updateId,
          updateBody: ctx.input.updateBody,
          replyId: ctx.input.replyId,
          parentItemId: ctx.input.parentItemId,
          userId: ctx.input.userId
        }
      };
    }
  })
  .build();
