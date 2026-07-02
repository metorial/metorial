import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List research projects in the Dovetail workspace. Supports filtering by title and folder, with pagination and sorting options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      titleContains: z
        .string()
        .optional()
        .describe('Filter projects whose title contains this substring (case-insensitive)'),
      folderId: z.string().optional().describe('Filter by folder ID'),
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
      projects: z.array(
        z.object({
          projectId: z.string(),
          title: z.string(),
          createdAt: z.string(),
          authorId: z.string().nullable().optional(),
          authorName: z.string().nullable().optional(),
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

    let result = await client.listProjects({
      titleContains: ctx.input.titleContains,
      folderId: ctx.input.folderId,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let projects = result.data.map(p => ({
      projectId: p.id,
      title: p.title,
      createdAt: p.created_at,
      authorId: p.author?.id ?? null,
      authorName: p.author?.name ?? null,
      folderId: p.folder?.id ?? null
    }));

    return {
      output: {
        projects,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** projects. Returned **${projects.length}** in this page.`
    };
  })
  .build();
