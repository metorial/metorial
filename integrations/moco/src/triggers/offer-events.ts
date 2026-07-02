import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let offerEvents = SlateTrigger.create(spec, {
  name: 'Offer Events',
  key: 'offer_events',
  description:
    'Triggers when an offer/proposal is created, updated, or deleted. Client digital confirmations trigger an update event.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, or delete'),
      offerId: z.number().describe('Offer ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      offerId: z.number().describe('Offer ID'),
      title: z.string().optional().describe('Offer title'),
      identifier: z.string().optional().describe('Offer number'),
      status: z.string().optional().describe('Offer status'),
      date: z.string().optional().describe('Offer date'),
      currency: z.string().optional().describe('Currency code'),
      netTotal: z.number().optional().describe('Net total'),
      grossTotal: z.number().optional().describe('Gross total'),
      companyId: z.number().optional().describe('Associated company ID'),
      companyName: z.string().optional().describe('Associated company name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Offer',
          event,
          hook: ctx.input.webhookBaseUrl
        });
        registrations.push({ webhookId: webhook.id, event });
      }

      return { registrationDetails: { webhooks: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number }>;
      };

      for (let reg of details.webhooks) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let event = ctx.request.headers.get('X-Moco-Event') || 'update';
      let timestamp = ctx.request.headers.get('X-Moco-Timestamp') || new Date().toISOString();
      let userId = ctx.request.headers.get('X-Moco-User-Id');

      return {
        inputs: [
          {
            eventType: event,
            offerId: body.id,
            timestamp,
            userId: userId ? Number(userId) : undefined,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: `offer.${ctx.input.eventType}`,
        id: `offer-${ctx.input.offerId}-${ctx.input.timestamp}`,
        output: {
          offerId: ctx.input.offerId,
          title: p?.title,
          identifier: p?.identifier,
          status: p?.status,
          date: p?.date,
          currency: p?.currency,
          netTotal: p?.net_total,
          grossTotal: p?.gross_total,
          companyId: p?.company?.id,
          companyName: p?.company?.name
        }
      };
    }
  })
  .build();
