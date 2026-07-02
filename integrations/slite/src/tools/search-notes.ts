import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchNotes = SlateTool.create(spec, {
  name: 'Search Notes',
  key: 'search_notes',
  description: `Search notes by keyword across the workspace. Results can be filtered by parent note, review state, edit date, and more. Returns highlighted matching snippets for each result.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query text'),
      parentNoteId: z
        .string()
        .optional()
        .describe('Restrict results to children of this note'),
      reviewState: z
        .enum(['Verified', 'Outdated', 'VerificationRequested', 'VerificationExpired'])
        .optional()
        .describe('Filter by review state'),
      lastEditedAfter: z
        .string()
        .optional()
        .describe('Only include notes edited after this ISO 8601 date'),
      includeArchived: z.boolean().optional().describe('Include archived notes in results'),
      page: z.number().optional().describe('Page number (0-indexed)'),
      hitsPerPage: z.number().optional().describe('Results per page (1-100)')
    })
  )
  .output(
    z.object({
      hits: z.array(
        z.object({
          noteId: z.string().describe('ID of the matching note'),
          title: z.string().describe('Title of the note'),
          type: z.string().describe('Note type: rich_text, discussion, or collection'),
          updatedAt: z.string().describe('Last update timestamp'),
          lastEditedAt: z.string().describe('Last content edit timestamp'),
          archivedAt: z.string().nullable().describe('Archive timestamp or null'),
          highlight: z.string().optional().describe('Search result highlight snippet'),
          reviewState: z.string().optional().describe('Current review state'),
          parentNotes: z
            .array(
              z.object({
                noteId: z.string(),
                title: z.string()
              })
            )
            .optional()
            .describe('Breadcrumb of parent notes')
        })
      ),
      page: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.searchNotes({
      query: ctx.input.query,
      parentNoteId: ctx.input.parentNoteId,
      reviewState: ctx.input.reviewState,
      lastEditedAfter: ctx.input.lastEditedAfter,
      includeArchived: ctx.input.includeArchived,
      page: ctx.input.page,
      hitsPerPage: ctx.input.hitsPerPage
    });

    let hits = (result.hits || []).map((hit: any) => ({
      noteId: hit.id,
      title: hit.title,
      type: hit.type,
      updatedAt: hit.updatedAt,
      lastEditedAt: hit.lastEditedAt,
      archivedAt: hit.archivedAt ?? null,
      highlight: hit.highlight,
      reviewState: hit.reviewState,
      parentNotes: hit.parentNotes?.map((p: any) => ({
        noteId: p.id,
        title: p.title
      }))
    }));

    return {
      output: {
        hits,
        page: result.page ?? 0,
        totalPages: result.nbPages ?? 1
      },
      message: `Found **${hits.length}** note(s) matching the search${ctx.input.query ? ` for "${ctx.input.query}"` : ''} (page ${(result.page ?? 0) + 1} of ${result.nbPages ?? 1})`
    };
  })
  .build();
