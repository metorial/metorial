import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

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
        .describe('Application ID to filter pages for a specific app')
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
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let pages = await client.listPages(ctx.input.appId);

    let mappedPages = (Array.isArray(pages) ? pages : []).map((p: any) => ({
      pageId: p.id || '',
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
