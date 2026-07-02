import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocs = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_docs',
  description: `List documents in the Dovetail workspace. Supports filtering by project, folder, and title, with pagination and sorting. Can also list documents for a specific user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'List documents for a specific user. If provided, other filters are ignored.'
        ),
      projectId: z.string().optional().describe('Filter by project ID'),
      folderId: z.string().optional().describe('Filter by folder ID'),
      titleContains: z
        .string()
        .optional()
        .describe('Filter docs whose title contains this substring'),
      sort: z
        .enum(['created_at:asc', 'created_at:desc', 'title:asc', 'title:desc'])
        .optional()
        .describe('Sort order'),
      limit: z.number().optional().describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      docs: z.array(
        z.object({
          docId: z.string(),
          title: z.string(),
          createdAt: z.string(),
          projectId: z.string().nullable().optional(),
          projectTitle: z.string().nullable().optional(),
          folderId: z.string().nullable().optional()
        })
      ),
      totalCount: z.number().optional(),
      hasMore: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.userId) {
      let userDocs = await client.listUserDocs(ctx.input.userId);
      let docs = (Array.isArray(userDocs) ? userDocs : []).map(d => ({
        docId: d.id,
        title: d.title,
        createdAt: d.created_at,
        projectId: d.project?.id ?? null,
        projectTitle: d.project?.title ?? null,
        folderId: d.folder?.id ?? null
      }));
      return {
        output: { docs },
        message: `Found **${docs.length}** documents for user ${ctx.input.userId}.`
      };
    }

    let result = await client.listDocs({
      projectId: ctx.input.projectId,
      folderId: ctx.input.folderId,
      titleContains: ctx.input.titleContains,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let docs = result.data.map(d => ({
      docId: d.id,
      title: d.title,
      createdAt: d.created_at,
      projectId: d.project?.id ?? null,
      projectTitle: d.project?.title ?? null,
      folderId: d.folder?.id ?? null
    }));

    return {
      output: {
        docs,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** documents. Returned **${docs.length}** in this page.`
    };
  })
  .build();
