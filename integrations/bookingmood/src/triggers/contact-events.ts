import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggers when a contact is created or updated.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type: contacts.created or contacts.updated'),
      contactNew: z.any().describe('New contact data'),
      contactOld: z.any().nullable().describe('Previous contact data')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('UUID of the contact'),
      organizationId: z.string().describe('UUID of the organization'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      name: z.string().nullable().describe('Full name'),
      email: z.string().nullable().describe('Email address'),
      phone: z.string().nullable().describe('Phone number'),
      companyName: z.string().nullable().describe('Company name'),
      city: z.string().nullable().describe('City'),
      country: z.string().nullable().describe('Country'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: ['contacts.created', 'contacts.updated'],
        description: 'Slates: Contact Events'
      });
      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            contactNew: data.payload?.new ?? null,
            contactOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contactNew;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          contactId: contact.id,
          organizationId: contact.organization_id,
          firstName: contact.first_name ?? null,
          lastName: contact.last_name ?? null,
          name: contact.name ?? null,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          companyName: contact.company_name ?? null,
          city: contact.city ?? null,
          country: contact.country ?? null,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        }
      };
    }
  })
  .build();
