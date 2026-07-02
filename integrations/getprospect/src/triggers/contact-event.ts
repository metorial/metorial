import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactEvent = SlateTrigger.create(spec, {
  name: 'Contact Event',
  key: 'contact_event',
  description: `Triggers when a contact-related event occurs in GetProspect, including when a new contact is saved, a corporate email is found, or a valid email is found. Does not trigger for manually added leads.`
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      contactId: z.string().optional().describe('ID of the contact'),
      contactData: z.any().describe('Full contact data from the webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Unique identifier of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      companyName: z.string().optional().describe('Company name'),
      companyUrl: z.string().optional().describe('Company website URL'),
      title: z.string().optional().describe('Job title'),
      phone: z.string().optional().describe('Phone number'),
      linkedin: z.string().optional().describe('LinkedIn profile URL'),
      twitter: z.string().optional().describe('Twitter handle')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        description: 'Slates contact event webhook',
        events: ['new_contact_saved', 'corporate_email_found', 'valid_email_found']
      });

      return {
        registrationDetails: {
          webhookId: result.id ?? result.webhook_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhookId = ctx.input.registrationDetails?.webhookId;

      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();

      // Handle both single event and array of events
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        eventType: event.event ?? event.type ?? event.event_type ?? 'unknown',
        contactId: event.id ?? event.contact_id ?? event.lead_id ?? event.data?.id,
        contactData: event.data ?? event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contactData ?? {};

      let eventType = ctx.input.eventType;
      let type = `contact.${eventType}`;

      let contactId =
        ctx.input.contactId ?? contact.id ?? contact.contact_id ?? contact.lead_id ?? '';

      let dedupId = `${eventType}-${contactId}-${Date.now()}`;

      return {
        type,
        id: dedupId,
        output: {
          contactId: contactId || undefined,
          email: contact.email,
          firstName: contact.first_name ?? contact.firstName,
          lastName: contact.last_name ?? contact.lastName,
          companyName: contact.company_name ?? contact.companyName,
          companyUrl: contact.company_url ?? contact.companyUrl,
          title: contact.title,
          phone: contact.phone,
          linkedin: contact.linkedin,
          twitter: contact.twitter
        }
      };
    }
  })
  .build();
