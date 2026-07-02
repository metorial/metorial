import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPageChildren = SlateTool.create(spec, {
  name: 'Get Page Children',
  key: 'get_page_children',
  description: `Retrieve the direct child pages of a Confluence page. Useful for navigating the page hierarchy.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageId: z.string().describe('The parent page ID'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of children to return'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      children: z
        .array(
          z.object({
            pageId: z.string(),
            title: z.string(),
            status: z.string(),
            versionNumber: z.number().optional()
          })
        )
        .describe('List of child pages'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getPageChildren(ctx.input.pageId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextLink = response._links?.next;
    let nextCursor: string | undefined;
    if (nextLink) {
      let match = nextLink.match(/cursor=([^&]+)/);
      if (match) nextCursor = decodeURIComponent(match[1]!);
    }

    let children = response.results.map(p => ({
      pageId: p.id,
      title: p.title,
      status: p.status,
      versionNumber: p.version?.number
    }));

    return {
      output: { children, nextCursor },
      message: `Found **${children.length}** child pages under page ${ctx.input.pageId}`
    };
  })
  .build();
