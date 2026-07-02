import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactEventsTrigger = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when a contact is created or updated in Lever. Contacts represent unique individuals across all their opportunities.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      triggeredAt: z.string().describe('When the event occurred (ISO 8601)'),
      contactId: z.string().describe('Contact ID'),
      rawEvent: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the affected contact'),
      eventTimestamp: z.string().optional().describe('Timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

      let eventTypes = ['contactCreated', 'contactUpdated'];

      let registrations: Array<{ webhookId: string; event: string }> = [];

      for (let event of eventTypes) {
        let result = await client.createWebhook({
          url: `${ctx.input.webhookBaseUrl}/${event}`,
          event: event
        });
        registrations.push({
          webhookId: result.data.id,
          event: event
        });
      }

      return {
        registrationDetails: { webhooks: registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
      let webhooks = ctx.input.registrationDetails?.webhooks || [];

      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventSuffix = pathParts[pathParts.length - 1] || 'unknown';

      let eventData = body?.data || {};

      return {
        inputs: [
          {
            eventType: eventSuffix,
            triggeredAt: body?.triggeredAt
              ? new Date(body.triggeredAt).toISOString()
              : new Date().toISOString(),
            contactId: eventData.contactId || eventData.id || '',
            rawEvent: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        contactCreated: 'contact.created',
        contactUpdated: 'contact.updated'
      };

      return {
        type: typeMap[ctx.input.eventType] || `contact.${ctx.input.eventType}`,
        id: `${ctx.input.eventType}_${ctx.input.contactId}_${ctx.input.triggeredAt}`,
        output: {
          contactId: ctx.input.contactId,
          eventTimestamp: ctx.input.triggeredAt
        }
      };
    }
  })
  .build();
