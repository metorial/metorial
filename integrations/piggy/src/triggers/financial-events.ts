import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let FINANCIAL_EVENT_TYPES = [
  'prepaid_transaction_created',
  'giftcard_transaction_created'
] as const;

export let financialEvents = SlateTrigger.create(spec, {
  name: 'Financial Events',
  key: 'financial_events',
  description: 'Triggers when a prepaid transaction or gift card transaction is created.'
})
  .input(
    z.object({
      eventType: z.enum(FINANCIAL_EVENT_TYPES).describe('Type of financial event'),
      webhookUuid: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      transactionUuid: z.string().describe('UUID of the transaction'),
      transactionType: z.string().describe('"prepaid" or "giftcard"'),
      amountInCents: z.number().optional().describe('Transaction amount in cents'),
      contactUuid: z.string().optional().describe('UUID of the contact (prepaid only)'),
      giftcardUuid: z.string().optional().describe('UUID of the gift card (giftcard only)'),
      giftcardHash: z.string().optional().describe('Gift card hash (giftcard only)'),
      shopUuid: z.string().optional().describe('UUID of the shop'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ eventType: string; subscriptionUuid: string }> = [];

      for (let eventType of FINANCIAL_EVENT_TYPES) {
        try {
          let result = await client.createWebhookSubscription({
            name: `Slates - ${eventType}`,
            eventType,
            url: ctx.input.webhookBaseUrl
          });
          let sub = result.data || result;
          registrations.push({ eventType, subscriptionUuid: sub.uuid });
        } catch {
          /* skip if not supported */
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
      let eventType = body.event_type || body.type || 'prepaid_transaction_created';

      return {
        inputs: [
          {
            eventType: FINANCIAL_EVENT_TYPES.includes(eventType)
              ? eventType
              : 'prepaid_transaction_created',
            webhookUuid: body.uuid || body.id || `financial-${Date.now()}`,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, rawPayload } = ctx.input;
      let data = rawPayload?.data || rawPayload || {};

      let isPrepaid = eventType === 'prepaid_transaction_created';

      return {
        type: isPrepaid ? 'prepaid_transaction.created' : 'giftcard_transaction.created',
        id: ctx.input.webhookUuid || `financial-${Date.now()}`,
        output: {
          transactionUuid: data.uuid || '',
          transactionType: isPrepaid ? 'prepaid' : 'giftcard',
          amountInCents: data.amount_in_cents,
          contactUuid: data.contact?.uuid,
          giftcardUuid: data.giftcard?.uuid,
          giftcardHash: data.giftcard?.hash,
          shopUuid: data.shop?.uuid,
          createdAt: data.created_at
        }
      };
    }
  })
  .build();
