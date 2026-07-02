import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggers when a contact is created, updated, or deleted in Altoviz.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (ContactCreated, ContactUpdated, ContactDeleted)'),
      webhookId: z.string().describe('Webhook ID'),
      contact: z.any().describe('Contact entity data from the webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Altoviz contact ID'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      cellPhone: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      internalId: z.string().nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        name: 'Slates Contact Events',
        types: ['ContactCreated', 'ContactUpdated', 'ContactDeleted'],
        url: ctx.input.webhookBaseUrl
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
      let body = (await ctx.request.json()) as any;
      return {
        inputs: [
          {
            eventType: body.type,
            webhookId: String(body.id),
            contact: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contact || {};
      let eventTypeMap: Record<string, string> = {
        ContactCreated: 'contact.created',
        ContactUpdated: 'contact.updated',
        ContactDeleted: 'contact.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `contact.${ctx.input.eventType.toLowerCase()}`,
        id: `${ctx.input.webhookId}-${contact.id || 'unknown'}-${ctx.input.eventType}`,
        output: {
          contactId: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          cellPhone: contact.cellPhone,
          title: contact.title,
          internalId: contact.internalId
        }
      };
    }
  })
  .build();
