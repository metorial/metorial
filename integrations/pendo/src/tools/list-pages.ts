import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, validateMultiAppFilter } from './helpers';

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List all tagged pages in Pendo. Returns page names, IDs, and URL rules. Optionally filter by application ID for multi-app subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z
        .string()
        .optional()
        .describe('Application ID to filter pages for a specific app'),
      expandAll: z
        .boolean()
        .optional()
        .describe('Set to true to return pages from all apps in a multi-app subscription')
    })
  )
  .output(
    z.object({
      pages: z
        .array(
          z.object({
            pageId: z.string().describe('Page ID'),
            name: z.string().describe('Page name'),
            raw: z.any().describe('Full raw page record')
          })
        )
        .describe('List of pages'),
      totalCount: z.number().describe('Total number of pages returned')
    })
  )
  .handleInvocation(async ctx => {
    validateMultiAppFilter(ctx.input);
    let client = createPendoClient(ctx);

    let pages = await client.listPages({
      appId: ctx.input.appId,
      expandAll: ctx.input.expandAll
    });

    let mappedPages = (Array.isArray(pages) ? pages : []).map((p: any) => ({
      pageId: p.id || p.pageId || '',
      name: p.name || '',
      raw: p
    }));

    return {
      output: {
        pages: mappedPages,
        totalCount: mappedPages.length
      },
      message: `Found **${mappedPages.length}** page(s) in Pendo.`
    };
  })
  .build();
