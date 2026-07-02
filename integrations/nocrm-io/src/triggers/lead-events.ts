import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let leadEvents = SlateTrigger.create(spec, {
  name: 'Lead Events',
  key: 'lead_events',
  description:
    'Fires when lead events occur: creation, status changes, step changes, assignments, comments, content changes, and deletions.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of lead event'),
      webhookId: z.number().optional().describe('Webhook ID'),
      leadId: z.number().describe('ID of the affected lead'),
      lead: z.any().describe('Full lead object from the webhook payload')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the affected lead'),
      title: z.string().describe('Title of the lead'),
      status: z.string().optional().describe('Current status of the lead'),
      step: z.string().optional().describe('Current pipeline step'),
      pipeline: z.string().optional().describe('Pipeline name'),
      amount: z.number().optional().describe('Deal amount'),
      userId: z.number().optional().describe('Assigned user ID'),
      tags: z.array(z.string()).optional().describe('Tags on the lead'),
      starred: z.boolean().optional().describe('Whether the lead is starred'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      closedAt: z.string().optional().describe('Closed timestamp'),
      clientFolderId: z.number().optional().describe('Client folder ID'),
      permalink: z.string().optional().describe('Link to the lead')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let events = [
        'lead.creation',
        'lead.status.changed',
        'lead.step.changed',
        'lead.assigned',
        'lead.unassigned',
        'lead.commented',
        'lead.content_has_changed',
        'lead.deleted'
      ];

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
      let lead = body.lead || body;
      let leadId = lead.id || body.id;

      return {
        inputs: [
          {
            eventType,
            webhookId: body.webhook_id,
            leadId,
            lead
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let lead = ctx.input.lead || {};

      return {
        type: ctx.input.eventType || 'lead.event',
        id: `${ctx.input.leadId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          leadId: ctx.input.leadId,
          title: lead.title || '',
          status: lead.status,
          step: lead.step,
          pipeline: lead.pipeline,
          amount: lead.amount,
          userId: lead.user_id,
          tags: lead.tags,
          starred: lead.starred,
          createdAt: lead.created_at,
          updatedAt: lead.updated_at,
          closedAt: lead.closed_at,
          clientFolderId: lead.client_folder_id,
          permalink: lead.extended_info?.permalink
        }
      };
    }
  })
  .build();
