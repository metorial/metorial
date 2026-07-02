import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let GIFT_EVENT_TYPES = [
  'com.blackbaud.gift.add.v1',
  'com.blackbaud.gift.change.v1',
  'com.blackbaud.gift.delete.v1'
] as const;

export let giftEvents = SlateTrigger.create(spec, {
  name: 'Gift Events',
  key: 'gift_events',
  description:
    'Triggers when gifts (donations) are added, changed, or deleted in Blackbaud. Useful for triggering workflows when donations are received or modified.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The CloudEvents event type (e.g., com.blackbaud.gift.add.v1).'),
      eventId: z.string().describe('Unique event ID.'),
      giftId: z.string().optional().describe('System record ID of the affected gift.'),
      rawEvent: z.any().describe('Full CloudEvents payload.')
    })
  )
  .output(
    z.object({
      giftId: z.string().optional().describe('System record ID of the affected gift.'),
      action: z.string().describe('The action performed (add, change, delete).'),
      gift: z.any().optional().describe('The gift record if available.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subscriptionKey: ctx.auth.subscriptionKey
      });

      let subscriptionIds: string[] = [];

      for (let eventType of GIFT_EVENT_TYPES) {
        try {
          let result = await client.createWebhookSubscription(
            ctx.input.webhookBaseUrl,
            eventType
          );
          if (result?.id) {
            subscriptionIds.push(result.id);
          }
        } catch (_e) {
          // Some event types may not be available
        }
      }

      return {
        registrationDetails: { subscriptionIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subscriptionKey: ctx.auth.subscriptionKey
      });

      let ids = ctx.input.registrationDetails?.subscriptionIds || [];
      for (let id of ids) {
        try {
          await client.deleteWebhookSubscription(id);
        } catch (_e) {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      if (ctx.request.method === 'OPTIONS') {
        return { inputs: [] };
      }

      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let giftId = event?.data?.gift_id || event?.data?.id || event?.subject;

        return {
          eventType: event?.type || '',
          eventId: event?.id || `${event?.type}-${Date.now()}`,
          giftId: giftId ? String(giftId) : undefined,
          rawEvent: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let parts = ctx.input.eventType
        .replace('com.blackbaud.', '')
        .replace('.v1', '')
        .split('.');
      let action = parts[parts.length - 1] ?? 'unknown';

      let type = `gift.${action === 'add' ? 'created' : action === 'change' ? 'updated' : action === 'delete' ? 'deleted' : action}`;

      let output: {
        giftId?: string;
        action: string;
        gift?: any;
      } = {
        giftId: ctx.input.giftId,
        action
      };

      if (ctx.input.giftId && action !== 'delete') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            subscriptionKey: ctx.auth.subscriptionKey
          });
          output.gift = await client.getGift(ctx.input.giftId);
        } catch {
          // Gift may not be accessible
        }
      }

      return {
        type,
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
