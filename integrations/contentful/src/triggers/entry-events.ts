import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let entryEvents = SlateTrigger.create(spec, {
  name: 'Entry Events',
  key: 'entry_events',
  description:
    'Triggers when an entry is created, saved, published, unpublished, archived, unarchived, or deleted via Contentful webhooks.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe(
          'The entry action that triggered the event (e.g. create, save, publish, unpublish, archive, unarchive, delete).'
        ),
      entryId: z.string().describe('ID of the affected entry.'),
      contentTypeId: z.string().optional().describe('Content type ID of the entry.'),
      spaceId: z.string().optional().describe('Space ID.'),
      environmentId: z.string().optional().describe('Environment ID.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Entry fields at the time of the event.'),
      webhookCallId: z.string().describe('Unique identifier for this webhook call.')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('ID of the affected entry.'),
      contentTypeId: z.string().optional().describe('Content type ID of the entry.'),
      spaceId: z.string().optional().describe('Space ID.'),
      environmentId: z.string().optional().describe('Environment ID.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Entry fields at the time of the event.'),
      version: z.number().optional().describe('Version of the entry.'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp.'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let webhook = await client.createWebhook({
        name: `Slates - Entry Events`,
        url: ctx.input.webhookBaseUrl,
        topics: ['Entry.*'],
        active: true,
        filters: [
          {
            equals: [{ doc: 'sys.environment.sys.id' }, ctx.config.environmentId]
          }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.sys?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();
      let topic = ctx.request.headers.get('X-Contentful-Topic') || '';
      // Topic format: "ContentManagement.Entry.publish"
      let parts = topic.split('.');
      let eventAction = parts[2] || 'unknown';

      let sys = body?.sys || {};
      let webhookCallId =
        ctx.request.headers.get('X-Contentful-Webhook-Call-Id') || `${sys.id}-${Date.now()}`;

      return {
        inputs: [
          {
            eventAction,
            entryId: sys.id || '',
            contentTypeId: sys.contentType?.sys?.id,
            spaceId: sys.space?.sys?.id,
            environmentId: sys.environment?.sys?.id,
            fields: body?.fields,
            webhookCallId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let fields = ctx.input.fields;

      return {
        type: `entry.${ctx.input.eventAction}`,
        id: ctx.input.webhookCallId,
        output: {
          entryId: ctx.input.entryId,
          contentTypeId: ctx.input.contentTypeId,
          spaceId: ctx.input.spaceId,
          environmentId: ctx.input.environmentId,
          fields
        }
      };
    }
  })
  .build();
