import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let contactEventTrigger = SlateTrigger.create(spec, {
  name: 'Contact Event',
  key: 'contact_event',
  description:
    'Triggered when contacts are created or updated within Dialpad. Requires company admin privileges.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Event type (created or updated)'),
      contactId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      emails: z.array(z.string()).optional(),
      phones: z.array(z.string()).optional(),
      companyName: z.string().optional(),
      type: z.string().optional(),
      rawPayload: z.any().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      eventType: z.string().describe('Event type (created or updated)'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      displayName: z.string().optional(),
      emails: z.array(z.string()).optional(),
      phones: z.array(z.string()).optional(),
      companyName: z.string().optional(),
      type: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DialpadClient({
        token: ctx.auth.token,
        environment: ctx.auth.environment
      });

      let webhook = await client.createWebhook({
        hook_url: ctx.input.webhookBaseUrl
      });

      let subscription = await client.createContactEventSubscription({
        endpoint_id: webhook.id
      });

      return {
        registrationDetails: {
          webhookId: String(webhook.id),
          subscriptionId: String(subscription.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new DialpadClient({
        token: ctx.auth.token,
        environment: ctx.auth.environment
      });

      let details = ctx.input.registrationDetails as {
        webhookId: string;
        subscriptionId: string;
      };

      if (details.subscriptionId) {
        try {
          await client.deleteContactEventSubscription(details.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }

      if (details.webhookId) {
        try {
          await client.deleteWebhook(details.webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let contactId = String(event.id || event.contact_id || '');
        let eventType = event.action || event.event_type || event.type || 'updated';

        return {
          eventId: `${contactId}-${eventType}-${event.date || Date.now()}`,
          eventType,
          contactId,
          firstName: event.first_name,
          lastName: event.last_name,
          displayName: event.display_name,
          emails: event.emails,
          phones: event.phones,
          companyName: event.company_name,
          type: event.contact_type || event.type,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `contact.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          contactId: ctx.input.contactId || '',
          eventType: ctx.input.eventType,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          displayName: ctx.input.displayName,
          emails: ctx.input.emails,
          phones: ctx.input.phones,
          companyName: ctx.input.companyName,
          type: ctx.input.type
        }
      };
    }
  })
  .build();
