import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactEventTypes = ['contact.created', 'contact.updated', 'contact.deleted'] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when contact events occur such as created, updated, or deleted. Note: CSV imports do not trigger contact.created events.'
})
  .input(
    z.object({
      eventType: z.enum(contactEventTypes).describe('Type of contact event.'),
      eventId: z.string().describe('Unique event identifier.'),
      contactId: z.string().describe('ID of the contact.'),
      email: z.string().optional().describe('Contact email address.'),
      firstName: z.string().optional().nullable().describe('Contact first name.'),
      lastName: z.string().optional().nullable().describe('Contact last name.'),
      unsubscribed: z.boolean().optional().describe('Subscription status.'),
      createdAt: z.string().optional().describe('Event timestamp.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact.'),
      email: z.string().optional().describe('Contact email address.'),
      firstName: z.string().optional().nullable().describe('Contact first name.'),
      lastName: z.string().optional().nullable().describe('Contact last name.'),
      unsubscribed: z.boolean().optional().describe('Subscription status.'),
      createdAt: z.string().optional().describe('Event timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: [...contactEventTypes]
      });

      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type as string;
      if (!contactEventTypes.includes(eventType as any)) {
        return { inputs: [] };
      }

      let contactData = data.data || {};

      return {
        inputs: [
          {
            eventType: eventType as (typeof contactEventTypes)[number],
            eventId: contactData.id
              ? `${eventType}_${contactData.id}_${data.created_at || Date.now()}`
              : `${eventType}_${Date.now()}`,
            contactId: contactData.id || '',
            email: contactData.email,
            firstName: contactData.first_name,
            lastName: contactData.last_name,
            unsubscribed: contactData.unsubscribed,
            createdAt: data.created_at || contactData.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          contactId: ctx.input.contactId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          unsubscribed: ctx.input.unsubscribed,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
