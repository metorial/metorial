import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Perform a semantic search (Magic Search) across the entire Dovetail workspace. Searches highlights, notes, insights, channels, themes, and tags simultaneously using natural language queries.`,
  constraints: [
    'Max limit is 250 results per request.',
    'Uses offset-based pagination (not cursor-based).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Natural language search query'),
      offset: z
        .number()
        .optional()
        .describe('Number of results to skip (for pagination, default 0)'),
      limit: z.number().optional().describe('Max results to return (default 50, max 250)')
    })
  )
  .output(
    z.object({
      total: z.number(),
      notes: z.array(
        z.object({
          noteId: z.string(),
          title: z.string(),
          previewText: z.string().nullable().optional(),
          projectId: z.string().nullable().optional(),
          projectTitle: z.string().nullable().optional()
        })
      ),
      insights: z.array(
        z.object({
          insightId: z.string(),
          title: z.string(),
          previewText: z.string().nullable().optional(),
          published: z.boolean().optional()
        })
      ),
      highlights: z.array(
        z.object({
          highlightId: z.string(),
          previewText: z.string().nullable().optional(),
          noteId: z.string().nullable().optional(),
          noteTitle: z.string().nullable().optional()
        })
      ),
      tags: z.array(
        z.object({
          tagId: z.string(),
          title: z.string(),
          highlightCount: z.number()
        })
      ),
      channels: z.array(
        z.object({
          channelId: z.string(),
          title: z.string()
        })
      ),
      themes: z.array(
        z.object({
          themeId: z.string(),
          title: z.string(),
          summary: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.search(ctx.input.query, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    return {
      output: {
        total: result.total,
        notes: (result.notes || []).map(n => ({
          noteId: n.id,
          title: n.title,
          previewText: n.preview_text ?? null,
          projectId: n.project_id ?? null,
          projectTitle: n.project_title ?? null
        })),
        insights: (result.insights || []).map(i => ({
          insightId: i.id,
          title: i.title,
          previewText: i.preview_text ?? null,
          published: i.published
        })),
        highlights: (result.highlights || []).map(h => ({
          highlightId: h.id,
          previewText: h.preview_text ?? null,
          noteId: h.note_id ?? null,
          noteTitle: h.note_title ?? null
        })),
        tags: (result.tags || []).map(t => ({
          tagId: t.id,
          title: t.title,
          highlightCount: t.highlight_count
        })),
        channels: (result.channels || []).map(c => ({
          channelId: c.id,
          title: c.title
        })),
        themes: (result.themes || []).map(t => ({
          themeId: t.id,
          title: t.title,
          summary: t.summary
        }))
      },
      message: `Found **${result.total}** results for "${ctx.input.query}".`
    };
  })
  .build();
