import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes in the workspace with optional filters. Supports filtering by owner, parent note, and sort order. Use cursor-based pagination for large result sets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ownerId: z.string().optional().describe('Filter notes owned by this user ID'),
      parentNoteId: z.string().optional().describe('Filter notes under this parent note'),
      orderBy: z
        .enum([
          'lastEditedAt_DESC',
          'lastEditedAt_ASC',
          'listPosition_DESC',
          'listPosition_ASC'
        ])
        .optional()
        .describe('Sort order for results'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      notes: z.array(
        z.object({
          noteId: z.string().describe('ID of the note'),
          title: z.string().describe('Title of the note'),
          url: z.string().describe('URL to view the note'),
          parentNoteId: z.string().nullable().describe('Parent note ID'),
          updatedAt: z.string().describe('Last update timestamp'),
          lastEditedAt: z.string().describe('Last content edit timestamp'),
          archivedAt: z.string().nullable().describe('Archive timestamp or null'),
          reviewState: z.string().optional().describe('Review state'),
          owner: z
            .object({
              userId: z.string().optional(),
              groupId: z.string().optional()
            })
            .optional()
            .describe('Note owner')
        })
      ),
      total: z.number().describe('Total number of matching notes'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().nullable().describe('Cursor to use for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listNotes({
      ownerId: ctx.input.ownerId,
      parentNoteId: ctx.input.parentNoteId,
      orderBy: ctx.input.orderBy,
      cursor: ctx.input.cursor
    });

    let notes = (result.notes || []).map((note: any) => ({
      noteId: note.id,
      title: note.title,
      url: note.url,
      parentNoteId: note.parentNoteId ?? null,
      updatedAt: note.updatedAt,
      lastEditedAt: note.lastEditedAt,
      archivedAt: note.archivedAt ?? null,
      reviewState: note.reviewState,
      owner: note.owner
    }));

    return {
      output: {
        notes,
        total: result.total ?? notes.length,
        hasNextPage: result.hasNextPage ?? false,
        nextCursor: result.nextCursor ?? null
      },
      message: `Listed **${notes.length}** note(s) (total: ${result.total ?? notes.length})${result.hasNextPage ? ' — more results available' : ''}`
    };
  })
  .build();
