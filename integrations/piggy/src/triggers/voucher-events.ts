import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let VOUCHER_EVENT_TYPES = ['voucher_created', 'voucher_updated', 'voucher_redeemed'] as const;

export let voucherEvents = SlateTrigger.create(spec, {
  name: 'Voucher Events',
  key: 'voucher_events',
  description: 'Triggers when a voucher is created, updated, or redeemed.'
})
  .input(
    z.object({
      eventType: z.enum(VOUCHER_EVENT_TYPES).describe('Type of voucher event'),
      webhookUuid: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      voucherUuid: z.string().describe('UUID of the voucher'),
      code: z.string().optional().describe('Voucher code'),
      status: z.string().optional().describe('Voucher status'),
      promotionUuid: z.string().optional().describe('UUID of the promotion'),
      contactUuid: z.string().optional().describe('UUID of the contact'),
      shopUuid: z.string().optional().describe('UUID of the shop (for redemption)'),
      expirationDate: z.string().optional().describe('Expiration date'),
      createdAt: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ eventType: string; subscriptionUuid: string }> = [];

      for (let eventType of VOUCHER_EVENT_TYPES) {
        try {
          let result = await client.createWebhookSubscription({
            name: `Slates - ${eventType}`,
            eventType,
            url: ctx.input.webhookBaseUrl
          });
          let sub = result.data || result;
          registrations.push({ eventType, subscriptionUuid: sub.uuid });
        } catch {
          /* skip */
        }
      }

      return { registrationDetails: { subscriptions: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        subscriptions: Array<{ subscriptionUuid: string }>;
      };

      for (let sub of details.subscriptions || []) {
        try {
          await client.deleteWebhookSubscription(sub.subscriptionUuid);
        } catch {
          /* ignore cleanup errors */
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.event_type || body.type || 'voucher_created';

      return {
        inputs: [
          {
            eventType: VOUCHER_EVENT_TYPES.includes(eventType) ? eventType : 'voucher_created',
            webhookUuid: body.uuid || body.id || `voucher-${Date.now()}`,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, rawPayload } = ctx.input;
      let data = rawPayload?.data || rawPayload || {};

      let eventSuffix = eventType.replace('voucher_', '');

      return {
        type: `voucher.${eventSuffix}`,
        id: ctx.input.webhookUuid || `voucher-${Date.now()}`,
        output: {
          voucherUuid: data.uuid || '',
          code: data.code,
          status: data.status,
          promotionUuid: data.promotion?.uuid,
          contactUuid: data.contact?.uuid,
          shopUuid: data.shop?.uuid,
          expirationDate: data.expiration_date,
          createdAt: data.created_at || data.redeemed_at
        }
      };
    }
  })
  .build();
