import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let articleEvents = SlateTrigger.create(spec, {
  name: 'Article Events',
  key: 'article_events',
  description:
    'Triggers when Help Center article activity occurs, including article publication, unpublication, and subscription creation.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of article event'),
      eventId: z.string().describe('Unique event identifier'),
      articleId: z.string().describe('The article ID'),
      title: z.string().nullable().describe('The article title'),
      locale: z.string().nullable().describe('The article locale'),
      sectionId: z.string().nullable().describe('The section ID'),
      authorId: z.string().nullable().describe('The author user ID'),
      updatedAt: z.string().nullable().describe('When the article was last updated')
    })
  )
  .output(
    z.object({
      articleId: z.string().describe('The article ID'),
      title: z.string().nullable().describe('The article title'),
      locale: z.string().nullable().describe('The article locale'),
      sectionId: z.string().nullable().describe('The section ID'),
      authorId: z.string().nullable().describe('The author user ID'),
      updatedAt: z.string().nullable().describe('When the article was last updated')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      let webhook = await client.createWebhook({
        name: 'Slates Article Events',
        status: 'active',
        endpoint: ctx.input.webhookBaseUrl,
        http_method: 'POST',
        request_format: 'json',
        subscriptions: [
          'zen:event-type:article.published',
          'zen:event-type:article.unpublished',
          'zen:event-type:article.SubscriptionCreated'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let eventType = 'article.updated';
      if (data.type) {
        let typeParts = String(data.type).split(':');
        eventType = typeParts[typeParts.length - 1] || 'article.updated';
      }
      if (data.event?.type) {
        eventType = data.event.type;
      }

      let article = data.detail?.article || data.article || data;
      let articleId = String(article.id || data.id || 'unknown');

      return {
        inputs: [
          {
            eventType,
            eventId: `${articleId}-${data.id || Date.now()}`,
            articleId,
            title: article.title || null,
            locale: article.locale || null,
            sectionId: article.section_id ? String(article.section_id) : null,
            authorId: article.author_id ? String(article.author_id) : null,
            updatedAt: article.updated_at || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');
      if (!eventType.startsWith('article.')) {
        eventType = `article.${eventType}`;
      }

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          articleId: ctx.input.articleId,
          title: ctx.input.title,
          locale: ctx.input.locale,
          sectionId: ctx.input.sectionId,
          authorId: ctx.input.authorId,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
