import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let itemEventsTrigger = SlateTrigger.create(spec, {
  name: 'Item Events',
  key: 'item_events',
  description:
    'Fires when items are created, have their name changed, are archived, deleted, restored, or moved to a group on a board. Also covers sub-item creation and name changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Monday.com webhook event type'),
      webhookEventId: z.string().describe('Unique event identifier'),
      boardId: z.string().describe('Board ID the event occurred on'),
      itemId: z.string().nullable().describe('Item ID affected'),
      itemName: z.string().nullable().describe('Item name'),
      groupId: z.string().nullable().describe('Group ID'),
      parentItemId: z.string().nullable().describe('Parent item ID for sub-items'),
      userId: z.string().nullable().describe('User who triggered the event'),
      previousName: z.string().nullable().describe('Previous item name for name change events')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('Board ID'),
      itemId: z.string().describe('Affected item ID'),
      itemName: z.string().nullable().describe('Item name'),
      groupId: z.string().nullable().describe('Group ID'),
      parentItemId: z.string().nullable().describe('Parent item ID for sub-items'),
      userId: z.string().nullable().describe('User who triggered the event'),
      previousName: z.string().nullable().describe('Previous name for name change events')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MondayClient({ token: ctx.auth.token });

      let eventTypes = [
        'create_item',
        'change_name',
        'create_subitem',
        'change_subitem_name',
        'item_archived',
        'item_deleted',
        'item_restored',
        'item_moved_to_any_group'
      ];

      let registrations: Array<{ webhookId: string; eventType: string; boardId: string }> = [];

      // We need to know the board ID - it will be passed via the webhook URL path
      // Since Monday webhooks are per-board, the user needs to configure which board
      // We'll register webhooks for each event type
      // The boardId is expected to be encoded in the webhook URL
      let url = new URL(ctx.input.webhookBaseUrl);
      let boardId = url.searchParams.get('boardId');

      if (!boardId) {
        throw new Error(
          'Board ID is required. Configure the boardId query parameter on the webhook URL.'
        );
      }

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

      let eventType = event.type || body.type || 'unknown';
      let webhookEventId = `${event.pulseId || event.itemId || 'unknown'}-${eventType}-${Date.now()}`;

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
            itemName: event.pulseName || event.itemName || event.value?.name || null,
            groupId: event.groupId ? String(event.groupId) : null,
            parentItemId: event.parentItemId ? String(event.parentItemId) : null,
            userId: event.userId ? String(event.userId) : null,
            previousName: event.previousValue?.name || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        create_item: 'item.created',
        change_name: 'item.name_changed',
        create_subitem: 'subitem.created',
        change_subitem_name: 'subitem.name_changed',
        item_archived: 'item.archived',
        item_deleted: 'item.deleted',
        item_restored: 'item.restored',
        item_moved_to_any_group: 'item.moved'
      };

      let type = eventTypeMap[ctx.input.eventType] || `item.${ctx.input.eventType}`;

      return {
        type,
        id: ctx.input.webhookEventId,
        output: {
          boardId: ctx.input.boardId,
          itemId: ctx.input.itemId || '',
          itemName: ctx.input.itemName,
          groupId: ctx.input.groupId,
          parentItemId: ctx.input.parentItemId,
          userId: ctx.input.userId,
          previousName: ctx.input.previousName
        }
      };
    }
  })
  .build();
