import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { mondayServiceError } from '../lib/errors';
import { spec } from '../spec';

export let columnValueChangesTrigger = SlateTrigger.create(spec, {
  name: 'Column Value Changes',
  key: 'column_value_changes',
  description:
    'Fires when any column value changes on an item or sub-item on a board. Includes the column ID, previous value, and new value.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      webhookEventId: z.string().describe('Unique event identifier'),
      boardId: z.string().describe('Board ID'),
      itemId: z.string().nullable().describe('Item ID'),
      itemName: z.string().nullable().describe('Item name'),
      columnId: z.string().nullable().describe('Changed column ID'),
      columnType: z.string().nullable().describe('Column type'),
      columnTitle: z.string().nullable().describe('Column title'),
      newValue: z.any().nullable().describe('New column value'),
      previousValue: z.any().nullable().describe('Previous column value'),
      parentItemId: z.string().nullable().describe('Parent item ID for sub-item changes'),
      userId: z.string().nullable().describe('User who made the change')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('Board ID'),
      itemId: z.string().describe('Item ID'),
      itemName: z.string().nullable().describe('Item name'),
      columnId: z.string().nullable().describe('Column ID that changed'),
      columnType: z.string().nullable().describe('Column type'),
      columnTitle: z.string().nullable().describe('Column title'),
      newValue: z.any().nullable().describe('New column value'),
      previousValue: z.any().nullable().describe('Previous column value'),
      parentItemId: z.string().nullable().describe('Parent item ID for sub-item changes'),
      userId: z.string().nullable().describe('User who made the change')
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

      let eventTypes = ['change_column_value', 'change_subitem_column_value'];

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

      let eventType = event.type || body.type || 'change_column_value';
      let itemId = event.pulseId
        ? String(event.pulseId)
        : event.itemId
          ? String(event.itemId)
          : null;
      let webhookEventId = `${itemId || 'unknown'}-${event.columnId || 'unknown'}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            webhookEventId,
            boardId: String(event.boardId || body.boardId || ''),
            itemId,
            itemName: event.pulseName || event.itemName || null,
            columnId: event.columnId || null,
            columnType: event.columnType || null,
            columnTitle: event.columnTitle || null,
            newValue: event.value || null,
            previousValue: event.previousValue || null,
            parentItemId: event.parentItemId ? String(event.parentItemId) : null,
            userId: event.userId ? String(event.userId) : null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let isSubitem =
        ctx.input.eventType === 'change_subitem_column_value' || !!ctx.input.parentItemId;
      let type = isSubitem ? 'subitem.column_changed' : 'item.column_changed';

      return {
        type,
        id: ctx.input.webhookEventId,
        output: {
          boardId: ctx.input.boardId,
          itemId: ctx.input.itemId || '',
          itemName: ctx.input.itemName,
          columnId: ctx.input.columnId,
          columnType: ctx.input.columnType,
          columnTitle: ctx.input.columnTitle,
          newValue: ctx.input.newValue,
          previousValue: ctx.input.previousValue,
          parentItemId: ctx.input.parentItemId,
          userId: ctx.input.userId
        }
      };
    }
  })
  .build();
