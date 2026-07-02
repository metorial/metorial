import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggers when a new contact is added to a site.'
})
  .input(
    z.object({
      eventType: z.literal('site_contact.created'),
      eventId: z.string(),
      timestamp: z.number(),
      contact: z.any()
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      siteId: z.string().nullable(),
      email: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      phone: z.string().nullable(),
      marketingStatus: z.string().nullable(),
      source: z.string().nullable(),
      createdAt: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let result = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { eventType: 'site_contact.created' }
      ]);

      return {
        registrationDetails: { webhookId: result.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FingertipClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        id: string;
        created: number;
        type: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventType: 'site_contact.created' as const,
            eventId: data.id,
            timestamp: data.created,
            contact: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contact;

      return {
        type: 'site_contact.created',
        id: ctx.input.eventId,
        output: {
          contactId: contact.id ?? ctx.input.eventId,
          siteId: contact.siteId ?? null,
          email: contact.email ?? '',
          name: contact.name ?? null,
          firstName: contact.firstName ?? null,
          lastName: contact.lastName ?? null,
          phone: contact.phone ?? null,
          marketingStatus: contact.marketingStatus ?? null,
          source: contact.source ?? null,
          createdAt: contact.createdAt ?? new Date(ctx.input.timestamp * 1000).toISOString()
        }
      };
    }
  })
  .build();
