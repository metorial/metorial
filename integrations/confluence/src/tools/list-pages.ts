import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List Confluence pages, optionally filtered by space, title, or status. Returns page metadata for each result. Supports pagination via cursor.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      spaceId: z.string().optional().describe('Filter pages by space ID'),
      title: z.string().optional().describe('Filter pages by exact title'),
      status: z
        .string()
        .optional()
        .describe('Filter by status: current, draft, trashed, archived'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of pages to return (default 25)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      sort: z.string().optional().describe('Sort order (e.g., "-modified-date", "title")')
    })
  )
  .output(
    z.object({
      pages: z
        .array(
          z.object({
            pageId: z.string(),
            title: z.string(),
            status: z.string(),
            spaceId: z.string().optional(),
            parentId: z.string().optional(),
            versionNumber: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .describe('List of pages'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getPages({
      spaceId: ctx.input.spaceId,
      title: ctx.input.title,
      status: ctx.input.status,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      sort: ctx.input.sort
    });

    let nextLink = response._links?.next;
    let nextCursor: string | undefined;
    if (nextLink) {
      let match = nextLink.match(/cursor=([^&]+)/);
      if (match) nextCursor = decodeURIComponent(match[1]!);
    }

    let pages = response.results.map(p => ({
      pageId: p.id,
      title: p.title,
      status: p.status,
      spaceId: p.spaceId,
      parentId: p.parentId ?? undefined,
      versionNumber: p.version?.number,
      createdAt: p.createdAt
    }));

    return {
      output: { pages, nextCursor },
      message: `Found **${pages.length}** pages${ctx.input.spaceId ? ` in space ${ctx.input.spaceId}` : ''}`
    };
  })
  .build();
