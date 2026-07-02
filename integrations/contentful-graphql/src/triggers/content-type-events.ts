import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createWebhookClient } from '../lib/helpers';
import { spec } from '../spec';

export let contentTypeEvents = SlateTrigger.create(spec, {
  name: 'Content Type Events',
  key: 'content_type_events',
  description:
    'Triggers when a content type is created, saved, or deleted in your Contentful space. Useful for monitoring changes to the content model that affect the GraphQL schema.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe(
          'The content type action that triggered the event (e.g. create, save, delete).'
        ),
      contentTypeId: z.string().describe('ID of the affected content type.'),
      spaceId: z.string().optional().describe('Space ID where the event occurred.'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID where the event occurred.'),
      contentTypeName: z.string().optional().describe('Name of the content type.'),
      contentTypeDescription: z
        .string()
        .optional()
        .describe('Description of the content type.'),
      webhookCallId: z.string().describe('Unique identifier for this webhook invocation.')
    })
  )
  .output(
    z.object({
      contentTypeId: z.string().describe('ID of the affected content type.'),
      contentTypeName: z.string().optional().describe('Name of the content type.'),
      contentTypeDescription: z
        .string()
        .optional()
        .describe('Description of the content type.'),
      spaceId: z.string().optional().describe('Space ID where the event occurred.'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID where the event occurred.'),
      displayField: z
        .string()
        .optional()
        .describe('The field used as the display field for this content type.'),
      fieldCount: z.number().optional().describe('Number of fields in the content type.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createWebhookClient(ctx.config, ctx.auth);

      let webhook = await client.createWebhook({
        name: 'Slates - Content Type Events',
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
      let client = createWebhookClient(ctx.config, ctx.auth);
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
            spaceId: sys.space?.sys?.id,
            environmentId: sys.environment?.sys?.id,
            contentTypeName: body?.name,
            contentTypeDescription: body?.description,
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
          contentTypeName: ctx.input.contentTypeName,
          contentTypeDescription: ctx.input.contentTypeDescription,
          spaceId: ctx.input.spaceId,
          environmentId: ctx.input.environmentId,
          displayField: undefined,
          fieldCount: undefined
        }
      };
    }
  })
  .build();
