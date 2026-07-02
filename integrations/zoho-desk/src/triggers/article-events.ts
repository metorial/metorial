import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let articleEventTypes = [
  'Article_Add',
  'Article_Update',
  'Article_Delete',
  'Article_Translation_Add',
  'Article_Translation_Update',
  'Article_Translation_Delete',
  'Article_Feedback_Add',
  'KBRootCategory_Add',
  'KBRootCategory_Update',
  'KBRootCategory_Delete',
  'KBSection_Add',
  'KBSection_Update',
  'KBSection_Delete'
] as const;

export let articleEvents = SlateTrigger.create(spec, {
  name: 'Knowledge Base Events',
  key: 'article_events',
  description:
    'Triggered when knowledge base articles, translations, categories, or sections are created, updated, deleted, or receive feedback.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of KB event'),
      resourceId: z
        .string()
        .describe('ID of the affected resource (article, category, or section)'),
      payload: z.any().describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('ID of the affected resource'),
      resourceType: z
        .string()
        .describe('Type of resource (article, translation, category, section, feedback)'),
      title: z.string().optional().describe('Article or category title/name'),
      status: z.string().optional().describe('Status of the resource'),
      categoryId: z.string().optional().describe('Category ID (for articles)'),
      previousState: z.any().optional().describe('Previous state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookIds: string[] = [];

      for (let eventType of articleEventTypes) {
        try {
          let webhookData: Record<string, any> = {
            name: `Slates - ${eventType}`,
            url: ctx.input.webhookBaseUrl,
            eventType,
            isActive: true
          };

          if (eventType.includes('_Update')) {
            webhookData.includePrevState = true;
          }

          let result = await client.createWebhook(webhookData);
          webhookIds.push(result.id);
        } catch {
          // Continue
        }
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          /* ignore */
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, any>;

      let eventType = data.eventType || data.event_type || 'unknown';
      let resource = data.payload || data;
      let resourceId =
        resource.id || resource.articleId || resource.categoryId || resource.sectionId || '';

      return {
        inputs: [
          {
            eventType,
            resourceId: String(resourceId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, resourceId, payload } = ctx.input;
      let resource = payload?.payload || payload || {};

      let resourceType = 'article';
      if (eventType.startsWith('Article_Translation')) resourceType = 'translation';
      else if (eventType.startsWith('Article_Feedback')) resourceType = 'feedback';
      else if (eventType.startsWith('KBRootCategory')) resourceType = 'category';
      else if (eventType.startsWith('KBSection')) resourceType = 'section';

      let normalizedType = eventType.replace(/_/g, '.').toLowerCase();

      return {
        type: normalizedType,
        id: `${resourceId}-${eventType}-${payload?.eventTime || Date.now()}`,
        output: {
          resourceId,
          resourceType,
          title: resource.title || resource.name,
          status: resource.status,
          categoryId: resource.categoryId,
          previousState: resource.prevState || payload?.prevState
        }
      };
    }
  })
  .build();
