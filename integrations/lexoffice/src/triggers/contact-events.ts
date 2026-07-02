import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CONTACT_EVENT_TYPES = ['contact.created', 'contact.changed', 'contact.deleted'] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggers when contacts are created, changed, or deleted in Lexoffice.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Lexoffice event type (e.g. contact.created)'),
      resourceId: z.string().describe('The contact resource ID'),
      organizationId: z.string().describe('The organization ID'),
      eventDate: z.string().describe('ISO timestamp of the event')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('The contact ID'),
      eventType: z.string().describe('The event type that occurred'),
      name: z.string().optional().describe('Company name or person name'),
      email: z.string().optional().describe('First email address found'),
      roles: z.any().optional().describe('Contact roles (customer, vendor)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions: { subscriptionId: string; eventType: string }[] = [];

      for (let eventType of CONTACT_EVENT_TYPES) {
        let sub = await client.createEventSubscription(eventType, ctx.input.webhookBaseUrl);
        subscriptions.push({ subscriptionId: sub.subscriptionId, eventType });
      }

      return {
        registrationDetails: { subscriptions }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subs = ctx.input.registrationDetails?.subscriptions ?? [];

      for (let sub of subs) {
        try {
          await client.deleteEventSubscription(sub.subscriptionId);
        } catch (_e) {
          /* ignore cleanup errors */
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.eventType,
            resourceId: body.resourceId,
            organizationId: body.organizationId,
            eventDate: body.eventDate
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let isDeleted = ctx.input.eventType === 'contact.deleted';

      let name: string | undefined;
      let email: string | undefined;
      let roles: any;

      if (!isDeleted) {
        try {
          let contact = await client.getContact(ctx.input.resourceId);
          name =
            contact.company?.name ||
            [contact.person?.firstName, contact.person?.lastName].filter(Boolean).join(' ') ||
            undefined;
          let emailAddresses =
            contact.emailAddresses?.business ??
            contact.emailAddresses?.office ??
            contact.emailAddresses?.private ??
            contact.emailAddresses?.other ??
            [];
          email = emailAddresses[0] || undefined;
          roles = contact.roles;
        } catch (_e) {
          /* resource may not be accessible */
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.resourceId}-${ctx.input.eventDate}`,
        output: {
          contactId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          name,
          email,
          roles
        }
      };
    }
  })
  .build();
