import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let staticPageEvents = SlateTrigger.create(spec, {
  name: 'Static Page Events',
  key: 'static_page_events',
  description:
    'Triggered when a static page is published, edited, or deleted in the publication.'
})
  .input(
    z.object({
      eventType: z
        .enum(['static_page_published', 'static_page_edited', 'static_page_deleted'])
        .describe('Type of static page event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      publicationId: z.string().describe('Publication ID'),
      pageId: z.string().describe('Static page ID')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the affected static page'),
      publicationId: z.string().describe('ID of the publication'),
      title: z
        .string()
        .nullable()
        .optional()
        .describe('Page title (not available for deleted pages)'),
      slug: z.string().nullable().optional().describe('Page URL slug'),
      hidden: z.boolean().nullable().optional().describe('Whether the page is hidden'),
      contentMarkdown: z.string().nullable().optional().describe('Page content in Markdown'),
      contentHtml: z.string().nullable().optional().describe('Page content in HTML')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.data?.eventType;
      let pageId = body?.data?.staticPage?.id;
      let publicationId = body?.data?.publication?.id;
      let eventId = body?.metadata?.uuid;

      if (!eventType || !pageId || !publicationId) {
        return { inputs: [] };
      }

      // Only handle static page events
      if (!eventType.startsWith('static_page_')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: eventId || `${eventType}_${pageId}_${Date.now()}`,
            publicationId,
            pageId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: any = {
        pageId: ctx.input.pageId,
        publicationId: ctx.input.publicationId
      };

      // For non-delete events, try to fetch full page details
      if (ctx.input.eventType !== 'static_page_deleted') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            publicationHost: ctx.config.publicationHost
          });

          let page = await client.getStaticPageById(ctx.input.pageId);
          if (page) {
            output.title = page.title;
            output.slug = page.slug;
            output.hidden = page.hidden;
            output.contentMarkdown = page.content?.markdown;
            output.contentHtml = page.content?.html;
          }
        } catch (_e) {
          // Page may not be accessible, return what we have
        }
      }

      let eventSuffix = ctx.input.eventType.replace('static_page_', '');
      return {
        type: `static_page.${eventSuffix}`,
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
