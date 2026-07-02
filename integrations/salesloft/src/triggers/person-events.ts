import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = ['person_created', 'person_updated', 'person_deleted'] as const;

export let personEvents = SlateTrigger.create(spec, {
  name: 'Person Events',
  key: 'person_events',
  description: 'Triggers when a person (contact) is created, updated, or deleted in SalesLoft.'
})
  .input(
    z.object({
      eventType: z.enum(EVENT_TYPES).describe('Type of person event'),
      eventId: z.string().describe('Unique event identifier'),
      person: z.any().describe('Person data from webhook payload')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('SalesLoft person ID'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      displayName: z.string().nullable().optional().describe('Full display name'),
      emailAddress: z.string().nullable().optional().describe('Primary email address'),
      phone: z.string().nullable().optional().describe('Phone number'),
      title: z.string().nullable().optional().describe('Job title'),
      city: z.string().nullable().optional().describe('City'),
      state: z.string().nullable().optional().describe('State'),
      country: z.string().nullable().optional().describe('Country'),
      doNotContact: z.boolean().nullable().optional().describe('Do-not-contact flag'),
      accountId: z.number().nullable().optional().describe('Associated account ID'),
      ownerId: z.number().nullable().optional().describe('Owner user ID'),
      customFields: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Custom fields'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ subscriptionId: number; eventType: string }> = [];

      for (let eventType of EVENT_TYPES) {
        let subscription = await client.createWebhookSubscription(
          ctx.input.webhookBaseUrl,
          eventType
        );
        registrations.push({
          subscriptionId: subscription.id,
          eventType
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ subscriptionId: number }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteWebhookSubscription(reg.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = ctx.request.headers.get('x-salesloft-event') || 'person_updated';

      return {
        inputs: [
          {
            eventType: eventType as (typeof EVENT_TYPES)[number],
            eventId: `${eventType}_${body?.id || Date.now()}`,
            person: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.person;

      return {
        type: `person.${ctx.input.eventType.replace('person_', '')}`,
        id: ctx.input.eventId,
        output: {
          personId: raw.id,
          firstName: raw.first_name,
          lastName: raw.last_name,
          displayName: raw.display_name,
          emailAddress: raw.email_address,
          phone: raw.phone,
          title: raw.title,
          city: raw.city,
          state: raw.state,
          country: raw.country,
          doNotContact: raw.do_not_contact,
          accountId: raw.account?.id ?? null,
          ownerId: raw.owner?.id ?? null,
          customFields: raw.custom_fields,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        }
      };
    }
  })
  .build();
