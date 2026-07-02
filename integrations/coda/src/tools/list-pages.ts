import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPagesTool = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List all pages in a Coda doc. Returns page names, IDs, subtitles, icons, and parent page relationships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      limit: z.number().optional().describe('Maximum number of pages to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      pages: z.array(
        z.object({
          pageId: z.string().describe('ID of the page'),
          name: z.string().describe('Name of the page'),
          subtitle: z.string().optional().describe('Subtitle of the page'),
          iconName: z.string().optional().describe('Icon name for the page'),
          parentPageId: z.string().optional().describe('ID of the parent page'),
          browserLink: z.string().optional().describe('URL to open the page')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPages(ctx.input.docId, {
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let pages = (result.items || []).map((page: any) => ({
      pageId: page.id,
      name: page.name,
      subtitle: page.subtitle,
      iconName: page.icon?.name,
      parentPageId: page.parent?.id,
      browserLink: page.browserLink
    }));

    return {
      output: {
        pages,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${pages.length}** page(s) in the doc.`
    };
  })
  .build();
