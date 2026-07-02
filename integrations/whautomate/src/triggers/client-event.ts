import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientEventTypes = ['client_created', 'client_tag_added', 'client_tag_removed'] as const;

export let clientEvent = SlateTrigger.create(spec, {
  name: 'Client Event',
  key: 'client_event',
  description:
    'Triggered when a client is created, or when tags are added to or removed from a client.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The webhook event type (client_created, client_tag_added, client_tag_removed)'
        ),
      eventId: z.string().describe('Unique event ID'),
      eventTimestamp: z.string().describe('Event timestamp'),
      clientData: z.record(z.string(), z.any()).describe('Client payload from the webhook')
    })
  )
  .output(
    z.object({
      clientId: z.string().describe('Client ID'),
      fullName: z.string().optional().describe('Client full name'),
      firstName: z.string().optional().describe('Client first name'),
      lastName: z.string().optional().describe('Client last name'),
      phone: z.string().optional().describe('Phone number'),
      email: z.string().optional().describe('Email address'),
      tags: z.array(z.string()).optional().describe('Current tags on the client'),
      addedTags: z
        .array(z.string())
        .optional()
        .describe('Tags that were added (for tag_added events)'),
      removedTags: z
        .array(z.string())
        .optional()
        .describe('Tags that were removed (for tag_removed events)'),
      locationId: z.string().optional().describe('Primary location ID'),
      locationTitle: z.string().optional().describe('Primary location name'),
      createdAt: z.string().optional().describe('Client creation timestamp'),
      updatedAt: z.string().optional().describe('Client last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      let result = await client.createWebhook({
        serverUrl: ctx.input.webhookBaseUrl,
        eventTypes: [...clientEventTypes],
        isActive: true
      });

      return {
        registrationDetails: {
          webhookId: result.id || result._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event || {};
      let clientData = data.client || data;

      return {
        inputs: [
          {
            eventType: event.type || 'client_created',
            eventId: event.id || clientData.id || clientData._id || crypto.randomUUID(),
            eventTimestamp:
              event.timeStamp || clientData.createdAt || new Date().toISOString(),
            clientData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.clientData;

      let tags: string[] = [];
      if (c.tags) {
        try {
          tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags;
        } catch {
          tags = [];
        }
      }

      let eventSubtype = ctx.input.eventType.replace('client_', '');

      return {
        type: `client.${eventSubtype}`,
        id: ctx.input.eventId,
        output: {
          clientId: c.id || c._id || ctx.input.eventId,
          fullName: c.fullName,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          email: c.email,
          tags,
          addedTags: c.addedTags,
          removedTags: c.removedTags,
          locationId: c.location?.id,
          locationTitle: c.location?.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        }
      };
    }
  })
  .build();
