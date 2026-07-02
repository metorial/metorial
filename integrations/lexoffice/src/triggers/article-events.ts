import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ARTICLE_EVENT_TYPES = ['article.created', 'article.changed', 'article.deleted'] as const;

export let articleEvents = SlateTrigger.create(spec, {
  name: 'Article Events',
  key: 'article_events',
  description: 'Triggers when articles are created, changed, or deleted in Lexoffice.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Lexoffice event type (e.g. article.created)'),
      resourceId: z.string().describe('The article resource ID'),
      organizationId: z.string().describe('The organization ID'),
      eventDate: z.string().describe('ISO timestamp of the event')
    })
  )
  .output(
    z.object({
      articleId: z.string().describe('The article ID'),
      eventType: z.string().describe('The event type that occurred'),
      title: z.string().optional().describe('Article title'),
      articleNumber: z.string().optional().describe('Article number'),
      articleType: z.string().optional().describe('Article type (PRODUCT or SERVICE)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions: { subscriptionId: string; eventType: string }[] = [];

      for (let eventType of ARTICLE_EVENT_TYPES) {
        let sub = await client.createEventSubscription(eventType, ctx.input.webhookBaseUrl);
        subscriptions.push({ subscriptionId: sub.subscriptionId, eventType });
      }

      return {
        registrationDetails: { subscriptions }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subs = ctx.input.registrationDetails?.subscriptions ?? [];

      for (let sub of subs) {
        try {
          await client.deleteEventSubscription(sub.subscriptionId);
        } catch (_e) {
          /* ignore cleanup errors */
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.eventType,
            resourceId: body.resourceId,
            organizationId: body.organizationId,
            eventDate: body.eventDate
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let isDeleted = ctx.input.eventType === 'article.deleted';

      let title: string | undefined;
      let articleNumber: string | undefined;
      let articleType: string | undefined;

      if (!isDeleted) {
        try {
          let article = await client.getArticle(ctx.input.resourceId);
          title = article.title;
          articleNumber = article.articleNumber;
          articleType = article.type;
        } catch (_e) {
          /* resource may not be accessible */
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.resourceId}-${ctx.input.eventDate}`,
        output: {
          articleId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          title,
          articleNumber,
          articleType
        }
      };
    }
  })
  .build();
