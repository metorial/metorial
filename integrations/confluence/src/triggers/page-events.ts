import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let pageEventTypes = [
  'page_created',
  'page_updated',
  'page_moved',
  'page_copied',
  'page_trashed',
  'page_restored',
  'page_removed',
  'page_archived',
  'page_unarchived',
  'page_viewed',
  'page_children_reordered',
  'page_published',
  'blueprint_page_created'
] as const;

export let pageEvents = SlateTrigger.create(spec, {
  name: 'Page Events',
  key: 'page_events',
  description:
    'Triggered when pages are created, updated, moved, copied, trashed, restored, removed, archived, unarchived, viewed, published, or when children are reordered.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of page event'),
      pageId: z.string().describe('The page ID'),
      timestamp: z.string().describe('When the event occurred'),
      userAccountId: z
        .string()
        .optional()
        .describe('The account ID of the user who triggered the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('The page ID'),
      title: z.string().optional().describe('The page title'),
      status: z.string().optional().describe('The page status'),
      spaceId: z.string().optional().describe('The space ID'),
      versionNumber: z.number().optional().describe('The page version number'),
      authorId: z.string().optional().describe('The user who triggered the event'),
      webUrl: z.string().optional().describe('Web URL to view the page')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);

      let result = await client.registerWebhook({
        name: 'Slates Page Events',
        url: ctx.input.webhookBaseUrl,
        events: [...pageEventTypes]
      });

      return {
        registrationDetails: { webhookId: String(result.id || result) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.unregisterWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.eventType || 'unknown';
      let pageId = data.page?.id || data.content?.id || data.id || '';
      let timestamp = data.timestamp ? String(data.timestamp) : new Date().toISOString();
      let userAccountId = data.userAccountId || data.user?.accountId;

      return {
        inputs: [
          {
            eventType: String(eventType),
            pageId: String(pageId),
            timestamp,
            userAccountId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: any = {
        pageId: ctx.input.pageId,
        authorId: ctx.input.userAccountId
      };

      // Try to fetch page details if available
      try {
        let client = createClient(ctx.auth, ctx.config);
        let page = await client.getPageById(ctx.input.pageId);
        output.title = page.title;
        output.status = page.status;
        output.spaceId = page.spaceId;
        output.versionNumber = page.version?.number;
        output.webUrl = page._links?.webui;
      } catch {
        // Page may have been deleted or not accessible
        output.title =
          ctx.input.rawPayload?.page?.title || ctx.input.rawPayload?.content?.title;
      }

      return {
        type: `page.${ctx.input.eventType.replace('page_', '').replace('blueprint_page_', '')}`,
        id: `${ctx.input.pageId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output
      };
    }
  })
  .build();
