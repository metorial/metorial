import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `Lists notes attached to a specific person, company, or deal. Returns note content, visibility, and author info with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityId: z.string().describe('ID of the person, company, or deal to list notes for'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.string(),
            content: z.string(),
            visibility: z.string(),
            authorName: z.string(),
            authorEmail: z.string(),
            createdAt: z.string(),
            parentNoteId: z.string().nullable()
          })
        )
        .describe('List of notes'),
      nextCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listNotes(ctx.input.entityId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextCursor: string | null = null;
    if (result.pagination.nextLink) {
      let url = new URL(result.pagination.nextLink);
      nextCursor = url.searchParams.get('cursor');
    }

    return {
      output: {
        notes: result.items.map(n => ({
          noteId: n.id,
          content: n.content,
          visibility: n.visibility,
          authorName: n.author.fullName,
          authorEmail: n.author.email,
          createdAt: n.createdAt,
          parentNoteId: n.parentNote?.id ?? null
        })),
        nextCursor
      },
      message: `Found **${result.items.length}** notes${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
