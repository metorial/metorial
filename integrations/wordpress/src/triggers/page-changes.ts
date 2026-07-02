import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient, extractPostSummary } from '../lib/helpers';
import { spec } from '../spec';

export let pageChangesTrigger = SlateTrigger.create(spec, {
  name: 'Page Changes',
  key: 'page_changes',
  description:
    'Triggers when a page is created or updated. Polls for new and modified pages at regular intervals.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the page was newly created or updated'),
      pageId: z.string().describe('ID of the affected page'),
      title: z.string().describe('Page title'),
      status: z.string().describe('Page status'),
      url: z.string().describe('Page URL'),
      slug: z.string().describe('URL slug'),
      date: z.string().describe('Publication date'),
      modifiedDate: z.string().describe('Last modified date'),
      authorName: z.string().describe('Author display name')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the affected page'),
      title: z.string().describe('Page title'),
      status: z.string().describe('Page status'),
      url: z.string().describe('Page URL'),
      slug: z.string().describe('URL slug'),
      date: z.string().describe('Publication date'),
      modifiedDate: z.string().describe('Last modified date'),
      authorName: z.string().describe('Author display name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownPageIds = (ctx.state?.knownPageIds as string[] | undefined) || [];

      let now = new Date().toISOString();

      let params: any = {
        perPage: 50,
        page: 1,
        orderBy: 'modified',
        order: 'DESC'
      };

      if (lastPollTime) {
        params.after = lastPollTime;
      }

      let pages: any[];
      try {
        pages = await client.listPages({ ...params, status: 'publish,draft,pending,private' });
      } catch {
        pages = await client.listPages(params);
      }

      let inputs = pages.map((page: any) => {
        let summary = extractPostSummary(page, ctx.config.apiType);
        let isNew = !knownPageIds.includes(summary.postId);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          pageId: summary.postId,
          title: summary.title,
          status: summary.status,
          url: summary.url,
          slug: summary.slug,
          date: summary.date,
          modifiedDate: summary.modifiedDate,
          authorName: summary.authorName
        };
      });

      let newKnownIds = [...new Set([...knownPageIds, ...inputs.map(i => i.pageId)])].slice(
        -500
      );

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownPageIds: newKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `page.${ctx.input.eventType}`,
        id: `page-${ctx.input.pageId}-${ctx.input.modifiedDate}`,
        output: {
          pageId: ctx.input.pageId,
          title: ctx.input.title,
          status: ctx.input.status,
          url: ctx.input.url,
          slug: ctx.input.slug,
          date: ctx.input.date,
          modifiedDate: ctx.input.modifiedDate,
          authorName: ctx.input.authorName
        }
      };
    }
  })
  .build();
