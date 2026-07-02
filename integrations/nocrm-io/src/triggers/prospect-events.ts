import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let prospectEvents = SlateTrigger.create(spec, {
  name: 'Prospect Events',
  key: 'prospect_events',
  description: 'Fires when prospect events occur: creation and updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of prospect event'),
      webhookId: z.number().optional().describe('Webhook ID'),
      prospectId: z.number().optional().describe('ID of the affected prospect'),
      prospect: z.any().describe('Prospect data from the webhook payload')
    })
  )
  .output(
    z.object({
      prospectId: z.number().optional().describe('ID of the prospect'),
      prospectingListId: z.number().optional().describe('Prospecting list ID'),
      fields: z.record(z.string(), z.any()).optional().describe('Prospect field values'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let events = ['prospect.created', 'prospect.updated'];
      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook(event, ctx.input.webhookBaseUrl);
        registeredWebhooks.push({ webhookId: webhook.id, event });
        await client.activateWebhook(webhook.id);
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let webhooks = ctx.input.registrationDetails?.webhooks || [];
      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event || body.webhook_event || 'unknown';
      let prospect = body.prospect || body;

      return {
        inputs: [
          {
            eventType,
            webhookId: body.webhook_id,
            prospectId: prospect.id || body.id,
            prospect
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let prospect = ctx.input.prospect || {};

      return {
        type: ctx.input.eventType || 'prospect.event',
        id: `${ctx.input.prospectId || 'unknown'}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          prospectId: ctx.input.prospectId,
          prospectingListId: prospect.prospecting_list_id,
          fields: prospect.fields || prospect,
          updatedAt: prospect.updated_at
        }
      };
    }
  })
  .build();
