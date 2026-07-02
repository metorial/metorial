import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let purchaseEvents = SlateTrigger.create(spec, {
  name: 'Purchase Events',
  key: 'purchase_events',
  description:
    'Triggers when a purchase/expenditure is created, updated, or deleted. Category assignments trigger update events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, or delete'),
      purchaseId: z.number().describe('Purchase ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      purchaseId: z.number().describe('Purchase ID'),
      title: z.string().optional().describe('Purchase title'),
      identifier: z.string().optional().describe('Purchase identifier'),
      status: z.string().optional().describe('Purchase status'),
      date: z.string().optional().describe('Purchase date'),
      currency: z.string().optional().describe('Currency code'),
      netTotal: z.number().optional().describe('Net total'),
      grossTotal: z.number().optional().describe('Gross total'),
      companyId: z.number().optional().describe('Supplier company ID'),
      companyName: z.string().optional().describe('Supplier company name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Purchase',
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
            purchaseId: body.id,
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
        type: `purchase.${ctx.input.eventType}`,
        id: `purchase-${ctx.input.purchaseId}-${ctx.input.timestamp}`,
        output: {
          purchaseId: ctx.input.purchaseId,
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
