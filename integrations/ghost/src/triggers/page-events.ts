import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let pageEventTypes = [
  'page.added',
  'page.edited',
  'page.deleted',
  'page.published',
  'page.published.edited',
  'page.unpublished',
  'page.scheduled',
  'page.unscheduled',
  'page.rescheduled',
  'page.tag.attached',
  'page.tag.detached'
] as const;

export let pageEvents = SlateTrigger.create(spec, {
  name: 'Page Events',
  key: 'page_events',
  description:
    'Triggered when pages are created, edited, deleted, published, unpublished, scheduled, or when tags are attached/detached from pages.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of page event'),
      page: z.any().describe('Page data from the webhook payload')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('Page ID'),
      title: z.string().describe('Page title'),
      slug: z.string().describe('URL-friendly slug'),
      status: z.string().describe('Page status'),
      visibility: z.string().describe('Page visibility'),
      featureImage: z.string().nullable().describe('Feature image URL'),
      publishedAt: z.string().nullable().describe('Publication timestamp'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp'),
      url: z.string().describe('Full page URL')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let webhookIds: string[] = [];
      for (let event of pageEventTypes) {
        let result = await client.createWebhook({
          event,
          targetUrl: `${ctx.input.webhookBaseUrl}/${event}`,
          name: `Slates: ${event}`
        });
        webhookIds.push(result.webhooks[0].id);
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventType = pathParts.slice(-2).join('.') || 'page.edited';

      let page = data?.page?.current ?? data?.page ?? data;

      return {
        inputs: [
          {
            eventType,
            page
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let page = ctx.input.page ?? {};

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${page.id ?? 'unknown'}-${page.updated_at ?? Date.now()}`,
        output: {
          pageId: page.id ?? '',
          title: page.title ?? '',
          slug: page.slug ?? '',
          status: page.status ?? '',
          visibility: page.visibility ?? 'public',
          featureImage: page.feature_image ?? null,
          publishedAt: page.published_at ?? null,
          createdAt: page.created_at ?? null,
          updatedAt: page.updated_at ?? null,
          url: page.url ?? ''
        }
      };
    }
  })
  .build();
