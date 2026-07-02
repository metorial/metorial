import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listData = SlateTool.create(spec, {
  name: 'List Data',
  key: 'list_data',
  description: `List data entries in the Dovetail workspace. Supports filtering by project, folder, title, and date range, with pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter by project ID'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      titleContains: z
        .string()
        .optional()
        .describe('Filter data whose title contains this substring'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return data created after this ISO 8601 date'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return data created before this ISO 8601 date'),
      sort: z
        .enum(['created_at:asc', 'created_at:desc', 'title:asc', 'title:desc'])
        .optional()
        .describe('Sort order'),
      limit: z.number().optional().describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          dataId: z.string(),
          title: z.string(),
          createdAt: z.string(),
          projectId: z.string().nullable().optional(),
          projectTitle: z.string().nullable().optional(),
          folderId: z.string().nullable().optional()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listData({
      projectId: ctx.input.projectId,
      folderId: ctx.input.folderId,
      titleContains: ctx.input.titleContains,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let entries = result.data.map(d => ({
      dataId: d.id,
      title: d.title,
      createdAt: d.created_at,
      projectId: d.project?.id ?? null,
      projectTitle: d.project?.title ?? null,
      folderId: d.folder?.id ?? null
    }));

    return {
      output: {
        entries,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** data entries. Returned **${entries.length}** in this page.`
    };
  })
  .build();
