import { createApiServiceError, SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let PAGE_TRIGGER_TYPES = ['page_created', 'page_metadata_updated', 'page_deleted'] as const;

export let pageEventsTrigger = SlateTrigger.create(spec, {
  name: 'Page Events',
  key: 'page_events',
  description:
    'Triggered when pages are created, have their metadata updated, or are deleted on a Webflow site.'
})
  .input(
    z.object({
      triggerType: z.string().describe('Type of page event'),
      pageId: z.string().optional().describe('ID of the affected page'),
      siteId: z.string().optional().describe('Site the page belongs to'),
      title: z.string().optional().describe('Page title'),
      slug: z.string().optional().describe('Page URL slug'),
      eventId: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().optional().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      pageId: z.string().optional().describe('ID of the affected page'),
      siteId: z.string().optional().describe('Site the page belongs to'),
      title: z.string().optional().describe('Page title'),
      slug: z.string().optional().describe('Page URL slug')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.siteId) {
        throw createApiServiceError(
          'siteId is required in config for automatic webhook registration.'
        );
      }
      let client = new WebflowClient(ctx.auth.token);
      let registeredWebhookIds: string[] = [];

      for (let triggerType of PAGE_TRIGGER_TYPES) {
        let webhook = await client.createWebhook(ctx.config.siteId, {
          triggerType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhookIds.push(webhook.id ?? webhook._id);
      }

      return {
        registrationDetails: {
          webhookIds: registeredWebhookIds,
          siteId: ctx.config.siteId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebflowClient(ctx.auth.token);
      let webhookIds: string[] = ctx.input.registrationDetails.webhookIds ?? [];
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be removed
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventId = data._id ?? data.id ?? crypto.randomUUID();
      let pageData = data.page ?? data;

      return {
        inputs: [
          {
            triggerType: data.triggerType ?? 'page_event',
            pageId: pageData.pageId ?? pageData.id ?? pageData._id,
            siteId: data.siteId ?? data.site,
            title: pageData.title,
            slug: pageData.slug,
            eventId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'page.updated';
      if (ctx.input.triggerType === 'page_created') eventType = 'page.created';
      else if (ctx.input.triggerType === 'page_deleted') eventType = 'page.deleted';
      else if (ctx.input.triggerType === 'page_metadata_updated')
        eventType = 'page.metadata_updated';

      return {
        type: eventType,
        id: ctx.input.eventId ?? crypto.randomUUID(),
        output: {
          pageId: ctx.input.pageId,
          siteId: ctx.input.siteId,
          title: ctx.input.title,
          slug: ctx.input.slug
        }
      };
    }
  })
  .build();
