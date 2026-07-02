import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let contactEventTypes = ['contact_created', 'contact_updated', 'contact_deleted'] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggered when contacts are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.enum(contactEventTypes).describe('Type of contact event'),
      eventId: z.string().describe('Unique event identifier'),
      contactId: z.string().describe('Contact ID'),
      contactUrl: z.string().optional().describe('Contact resource URL'),
      firstName: z.string().optional().nullable().describe('Contact first name'),
      lastName: z.string().optional().nullable().describe('Contact last name'),
      gender: z.string().optional().nullable().describe('Contact gender'),
      handles: z
        .array(
          z.object({
            handleId: z.string().optional(),
            type: z.string().optional(),
            value: z.string().optional()
          })
        )
        .optional()
        .describe('Contact handles'),
      customAttributes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Custom attributes'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      contactUrl: z.string().optional().describe('Contact resource URL'),
      firstName: z.string().optional().nullable().describe('Contact first name'),
      lastName: z.string().optional().nullable().describe('Contact last name'),
      gender: z.string().optional().nullable().describe('Contact gender'),
      handles: z
        .array(
          z.object({
            handleId: z.string().optional(),
            type: z.string().optional(),
            value: z.string().optional()
          })
        )
        .optional()
        .describe('Contact handles'),
      customAttributes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Custom attributes'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        { type: 'contact_created' },
        { type: 'contact_updated' },
        { type: 'contact_deleted' }
      ]);

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SuperchatClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let contact = data.contact || data.payload?.contact || {};

      return {
        inputs: [
          {
            eventType: data.event,
            eventId: data.id,
            contactId: contact.id || data.id,
            contactUrl: contact.url,
            firstName: contact.first_name,
            lastName: contact.last_name,
            gender: contact.gender,
            handles: contact.handles?.map((h: any) => ({
              handleId: h.id,
              type: h.type,
              value: h.value
            })),
            customAttributes: contact.custom_attributes,
            createdAt: contact.created_at,
            updatedAt: contact.updated_at
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
          contactUrl: ctx.input.contactUrl,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          gender: ctx.input.gender,
          handles: ctx.input.handles,
          customAttributes: ctx.input.customAttributes,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
