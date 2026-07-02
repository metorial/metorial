import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listHighlights = SlateTool.create(spec, {
  name: 'List Highlights',
  key: 'list_highlights',
  description: `List highlights across the workspace, or retrieve a specific highlight by ID. Highlights are annotated excerpts from research data tied to tags or themes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      highlightId: z
        .string()
        .optional()
        .describe('Retrieve a specific highlight by ID. If omitted, lists all highlights.'),
      limit: z.number().optional().describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      highlights: z.array(
        z.object({
          highlightId: z.string(),
          text: z.string().nullable().optional(),
          previewText: z.string().nullable().optional(),
          noteId: z.string().nullable().optional(),
          noteTitle: z.string().nullable().optional(),
          projectId: z.string().nullable().optional(),
          projectTitle: z.string().nullable().optional(),
          authorId: z.string().nullable().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
          tags: z.array(
            z.object({
              title: z.string().nullable(),
              highlightCount: z.number().nullable()
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.highlightId) {
      let h = await client.getHighlight(ctx.input.highlightId);
      return {
        output: {
          highlights: [
            {
              highlightId: h.id,
              text: h.text ?? null,
              previewText: h.preview_text ?? null,
              noteId: h.note_id ?? null,
              noteTitle: h.note_title ?? null,
              projectId: h.project_id ?? null,
              projectTitle: h.project_title ?? null,
              authorId: h.author_id ?? null,
              createdAt: h.created_at,
              updatedAt: h.updated_at,
              tags: (h.tags || []).map(t => ({
                title: t.title,
                highlightCount: t.highlight_count
              }))
            }
          ]
        },
        message: `Retrieved highlight **${h.id}**.`
      };
    }

    let result = await client.listHighlights({
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let highlights = (result.highlights || []).map(h => ({
      highlightId: h.id,
      text: (h as any).text ?? null,
      previewText: h.preview_text ?? null,
      noteId: h.note_id ?? null,
      noteTitle: h.note_title ?? null,
      projectId: h.project_id ?? null,
      projectTitle: h.project_title ?? null,
      authorId: h.author_id ?? null,
      createdAt: h.created_at,
      updatedAt: h.updated_at,
      tags: (h.tags || []).map(t => ({
        title: t.title,
        highlightCount: t.highlight_count
      }))
    }));

    return {
      output: { highlights },
      message: `Found **${highlights.length}** highlights.`
    };
  })
  .build();
