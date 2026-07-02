import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ALL_CONTACT_EVENTS = ['contact.created', 'contact.updated', 'contact.deleted'];

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggered when contacts are created, updated, or deleted in Quaderno.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier'),
      contactData: z.any().describe('Full contact payload from webhook')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      kind: z.string().optional().describe('Contact type (person or company)'),
      fullName: z.string().optional().describe('Full name or company name'),
      email: z.string().optional().describe('Email address'),
      taxId: z.string().optional().describe('Tax identification number'),
      country: z.string().optional().describe('Country code')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events_types: ALL_CONTACT_EVENTS
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.event_type || body.type || '';
      let data = body.data || body;
      let eventId = `${eventType}-${data.id || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            contactData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.contactData;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          contactId: data.id?.toString(),
          kind: data.kind,
          fullName: data.full_name,
          email: data.email,
          taxId: data.tax_id,
          country: data.country
        }
      };
    }
  })
  .build();
