import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let contentTypeEvents = SlateTrigger.create(spec, {
  name: 'Content Type Events',
  key: 'content_type_events',
  description:
    'Triggers when a content type is created, saved, published, unpublished, or deleted via Contentful webhooks.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The content type action (e.g. create, save, publish, unpublish, delete).'),
      contentTypeId: z.string().describe('ID of the affected content type.'),
      name: z.string().optional().describe('Name of the content type.'),
      spaceId: z.string().optional().describe('Space ID.'),
      environmentId: z.string().optional().describe('Environment ID.'),
      fields: z.array(z.any()).optional().describe('Content type field definitions.'),
      webhookCallId: z.string().describe('Unique identifier for this webhook call.')
    })
  )
  .output(
    z.object({
      contentTypeId: z.string().describe('ID of the affected content type.'),
      name: z.string().optional().describe('Name of the content type.'),
      spaceId: z.string().optional().describe('Space ID.'),
      environmentId: z.string().optional().describe('Environment ID.'),
      description: z.string().optional().describe('Content type description.'),
      displayField: z.string().optional().describe('Display field ID.'),
      fieldCount: z.number().optional().describe('Number of fields.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let webhook = await client.createWebhook({
        name: `Slates - Content Type Events`,
        url: ctx.input.webhookBaseUrl,
        topics: ['ContentType.*'],
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
      let parts = topic.split('.');
      let eventAction = parts[2] || 'unknown';

      let sys = body?.sys || {};
      let webhookCallId =
        ctx.request.headers.get('X-Contentful-Webhook-Call-Id') || `${sys.id}-${Date.now()}`;

      return {
        inputs: [
          {
            eventAction,
            contentTypeId: sys.id || '',
            name: body?.name,
            spaceId: sys.space?.sys?.id,
            environmentId: sys.environment?.sys?.id,
            fields: body?.fields,
            webhookCallId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `content_type.${ctx.input.eventAction}`,
        id: ctx.input.webhookCallId,
        output: {
          contentTypeId: ctx.input.contentTypeId,
          name: ctx.input.name,
          spaceId: ctx.input.spaceId,
          environmentId: ctx.input.environmentId,
          fieldCount: ctx.input.fields?.length
        }
      };
    }
  })
  .build();
