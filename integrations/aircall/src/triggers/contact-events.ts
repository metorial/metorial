import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactEventTypes = ['contact.created', 'contact.updated', 'contact.deleted'] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when contacts are created, updated, or deleted. Returns the full contact record including phone numbers, emails, and company information.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of contact event'),
      timestamp: z.number().describe('Event timestamp as UNIX timestamp'),
      webhookToken: z.string().describe('Webhook verification token'),
      contact: z.any().describe('The contact data from the event payload')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Unique contact identifier'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      fullName: z.string().nullable().describe('Full name'),
      companyName: z.string().nullable().describe('Company name'),
      information: z.string().nullable().describe('Additional information'),
      phoneNumbers: z
        .array(
          z.object({
            phoneNumberId: z.number(),
            label: z.string(),
            value: z.string()
          })
        )
        .describe('Phone numbers'),
      emails: z
        .array(
          z.object({
            emailId: z.number(),
            label: z.string(),
            value: z.string()
          })
        )
        .describe('Email addresses')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        [...contactEventTypes],
        'slates-contact-events'
      );
      return {
        registrationDetails: {
          webhookId: webhook.webhook_id,
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.resource !== 'contact') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event,
            timestamp: data.timestamp,
            webhookToken: data.token || '',
            contact: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contact;

      return {
        type: ctx.input.eventType,
        id: `${contact.id}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          contactId: contact.id,
          firstName: contact.first_name ?? null,
          lastName: contact.last_name ?? null,
          fullName: contact.name ?? null,
          companyName: contact.company_name ?? null,
          information: contact.information ?? null,
          phoneNumbers: (contact.phone_numbers || []).map((p: any) => ({
            phoneNumberId: p.id,
            label: p.label,
            value: p.value
          })),
          emails: (contact.emails || []).map((e: any) => ({
            emailId: e.id,
            label: e.label,
            value: e.value
          }))
        }
      };
    }
  })
  .build();
