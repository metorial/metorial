import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description:
    'Triggers when a company (customer/supplier/organization) is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type: create, update, or delete'),
      companyId: z.number().describe('Company ID'),
      timestamp: z.string().describe('Event timestamp'),
      userId: z.number().optional().describe('User ID that triggered the event'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('Company ID'),
      name: z.string().optional().describe('Company name'),
      type: z
        .string()
        .optional()
        .describe('Company type: customer, supplier, or organization'),
      email: z.string().optional().describe('Company email'),
      website: z.string().optional().describe('Company website'),
      currency: z.string().optional().describe('Default currency')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

      let events = ['create', 'update', 'delete'];
      let registrations: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          target: 'Company',
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
            companyId: body.id,
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
        type: `company.${ctx.input.eventType}`,
        id: `company-${ctx.input.companyId}-${ctx.input.timestamp}`,
        output: {
          companyId: ctx.input.companyId,
          name: p?.name,
          type: p?.type,
          email: p?.email,
          website: p?.website,
          currency: p?.currency
        }
      };
    }
  })
  .build();
