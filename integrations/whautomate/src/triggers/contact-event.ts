import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactEventTypes = [
  'contact_created',
  'contact_tag_added',
  'contact_tag_removed'
] as const;

export let contactEvent = SlateTrigger.create(spec, {
  name: 'Contact Event',
  key: 'contact_event',
  description:
    'Triggered when a contact is created, or when tags are added to or removed from a contact.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The webhook event type (contact_created, contact_tag_added, contact_tag_removed)'
        ),
      eventId: z.string().describe('Unique event ID'),
      eventTimestamp: z.string().describe('Event timestamp'),
      contactData: z.record(z.string(), z.any()).describe('Contact payload from the webhook')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      name: z.string().optional().describe('Contact name'),
      channel: z.string().optional().describe('Messaging channel'),
      phoneNumber: z.string().optional().describe('Phone number'),
      username: z.string().optional().describe('Username (Instagram/Telegram)'),
      stage: z.string().optional().describe('Contact stage (Subscriber, Lead, etc.)'),
      tags: z.array(z.string()).optional().describe('Current tags on the contact'),
      addedTags: z
        .array(z.string())
        .optional()
        .describe('Tags that were added (for tag_added events)'),
      removedTags: z
        .array(z.string())
        .optional()
        .describe('Tags that were removed (for tag_removed events)'),
      locationId: z.string().optional().describe('Location ID'),
      locationTitle: z.string().optional().describe('Location name'),
      lastActivity: z.string().optional().describe('Last activity timestamp'),
      createdAt: z.string().optional().describe('Contact creation timestamp'),
      updatedAt: z.string().optional().describe('Contact last update timestamp')
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
        eventTypes: [...contactEventTypes],
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
      let contactData = data.contact || data;

      return {
        inputs: [
          {
            eventType: event.type || 'contact_created',
            eventId: event.id || contactData.id || contactData._id || crypto.randomUUID(),
            eventTimestamp:
              event.timeStamp || contactData.createdAt || new Date().toISOString(),
            contactData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.contactData;

      let tags: string[] = [];
      if (c.tags) {
        try {
          tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags;
        } catch {
          tags = [];
        }
      }

      let eventSubtype = ctx.input.eventType.replace('contact_', '');

      return {
        type: `contact.${eventSubtype}`,
        id: ctx.input.eventId,
        output: {
          contactId: c.id || c._id || ctx.input.eventId,
          name: c.name,
          channel: c.channel,
          phoneNumber: c.phoneNumber,
          username: c.username,
          stage: c.stage,
          tags,
          addedTags: c.addedTags,
          removedTags: c.removedTags,
          locationId: c.location?.id,
          locationTitle: c.location?.title,
          lastActivity: c.lastActivity,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        }
      };
    }
  })
  .build();
