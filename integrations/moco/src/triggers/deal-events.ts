import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dealEvents = SlateTrigger.create(spec, {
  name: 'Deal Events',
  key: 'deal_events',
  description: 'Triggers when a deal/lead is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, or delete'),
      dealId: z.number().describe('Deal ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('Deal ID'),
      name: z.string().optional().describe('Deal name'),
      status: z.string().optional().describe('Deal status'),
      currency: z.string().optional().describe('Currency code'),
      money: z.number().optional().describe('Deal value'),
      companyId: z.number().optional().describe('Associated company ID'),
      companyName: z.string().optional().describe('Associated company name'),
      assignedUserId: z.number().optional().describe('Assigned user ID'),
      assignedUserName: z.string().optional().describe('Assigned user name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Deal',
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
            dealId: body.id,
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
        type: `deal.${ctx.input.eventType}`,
        id: `deal-${ctx.input.dealId}-${ctx.input.timestamp}`,
        output: {
          dealId: ctx.input.dealId,
          name: p?.name,
          status: p?.status,
          currency: p?.currency,
          money: p?.money,
          companyId: p?.company?.id,
          companyName: p?.company?.name,
          assignedUserId: p?.user?.id,
          assignedUserName: p?.user ? `${p.user.firstname} ${p.user.lastname}` : undefined
        }
      };
    }
  })
  .build();
