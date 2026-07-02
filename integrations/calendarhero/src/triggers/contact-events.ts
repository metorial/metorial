import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'New Contact via Scheduling Link',
  key: 'contact_events',
  description:
    'Triggers when a new contact is added through one of your personal scheduling links (e.g. when an external invitee books a meeting).'
})
  .input(
    z.object({
      eventType: z.string().describe('The CalendarHero event type'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Contact email address'),
      title: z.string().optional().describe('Job title'),
      organization: z.string().optional().describe('Organization name'),
      schedulingLink: z.string().optional().describe('The scheduling link the contact used'),
      raw: z.any().optional().describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      let hookUrl = `${ctx.input.webhookBaseUrl}/new_contact_added`;
      await client.createWebhook('new_contact_added', hookUrl);

      return {
        registrationDetails: { event: 'new_contact_added', hookUrl }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      try {
        await client.deleteWebhook('new_contact_added');
      } catch (_e) {
        // Ignore errors during unregistration
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            eventType: 'new_contact_added',
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p: any = ctx.input.payload || {};
      let contact: any = p.contact || p.data || p;

      let contactId = contact._id || contact.id || p._id || p.id || `contact-${Date.now()}`;
      let email = Array.isArray(contact.email) ? contact.email[0] : contact.email;

      return {
        type: 'contact.new_from_scheduling_link',
        id: String(contactId),
        output: {
          contactId: contact._id || contact.id,
          name: contact.name || contact.displayName,
          email,
          title: contact.title,
          organization: contact.organization || contact.company,
          schedulingLink: contact.schedulingLink || p.schedulingLink || p.link,
          raw: p
        }
      };
    }
  })
  .build();
