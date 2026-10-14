import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List research notes across the Dovetail workspace. Supports title and date filters. Content filtering uses full-text search with an opaque nextCursor and does not support sort.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      titleContains: z
        .string()
        .optional()
        .describe('Filter notes whose title contains this substring'),
      contentContains: z
        .string()
        .optional()
        .describe('Filter notes whose content contains this substring'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return notes created after this ISO 8601 date'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return notes created before this ISO 8601 date'),
      sort: z
        .enum(['created_at:asc', 'created_at:desc', 'title:asc', 'title:desc'])
        .optional()
        .describe('Sort order'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      notes: z.array(
        z.object({
          noteId: z.string(),
          title: z.string(),
          previewText: z.string().nullable().optional(),
          projectId: z.string().nullable().optional(),
          projectTitle: z.string().nullable().optional(),
          authorId: z.string().nullable().optional(),
          createdAt: z.string(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listNotes({
      titleContains: ctx.input.titleContains,
      contentContains: ctx.input.contentContains,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let notes = result.data.map(n => ({
      noteId: n.id,
      title: n.title,
      previewText: n.preview_text ?? null,
      projectId: n.project?.id ?? n.project_id ?? null,
      projectTitle: n.project?.title ?? n.project_title ?? null,
      authorId: n.author_id ?? null,
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));

    return {
      output: {
        notes,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** notes. Returned **${notes.length}** in this page.`
    };
  })
  .build();
