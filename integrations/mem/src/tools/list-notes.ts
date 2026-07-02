import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes from your Mem knowledge base with optional filtering. Results can be filtered by collection, task status, images, or file attachments. Supports cursor-based pagination.`,
  instructions: [
    'Use the "page" field with the "nextPage" value from a previous response to paginate through results.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of notes to return (default: 50).'),
      page: z
        .string()
        .optional()
        .describe('Opaque cursor from a previous response for pagination.'),
      orderBy: z
        .enum(['created_at', 'updated_at'])
        .optional()
        .describe('Sort order field (default: updated_at).'),
      collectionId: z
        .string()
        .optional()
        .describe('Filter to notes in a specific collection.'),
      containsOpenTasks: z.boolean().optional().describe('Filter to notes with open tasks.'),
      containsTasks: z.boolean().optional().describe('Filter to notes with any tasks.'),
      containsImages: z.boolean().optional().describe('Filter to notes with images.'),
      containsFiles: z.boolean().optional().describe('Filter to notes with file attachments.'),
      includeNoteContent: z
        .boolean()
        .optional()
        .describe('Include full markdown content in results (default: false).')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.string().describe('Unique ID of the note.'),
            title: z.string().describe('Title of the note.'),
            content: z
              .string()
              .nullable()
              .describe('Full markdown content (null unless includeNoteContent is true).'),
            snippet: z.string().nullable().describe('Preview snippet of the note content.'),
            collectionIds: z
              .array(z.string())
              .describe('IDs of collections the note belongs to.'),
            createdAt: z.string().describe('Creation timestamp in ISO 8601 format.'),
            updatedAt: z.string().describe('Last updated timestamp in ISO 8601 format.')
          })
        )
        .describe('List of notes matching the filters.'),
      total: z.number().describe('Total number of notes matching the filters.'),
      nextPage: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results (null if no more pages).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.listNotes({
      limit: ctx.input.limit,
      page: ctx.input.page,
      orderBy: ctx.input.orderBy,
      collectionId: ctx.input.collectionId,
      containsOpenTasks: ctx.input.containsOpenTasks,
      containsTasks: ctx.input.containsTasks,
      containsImages: ctx.input.containsImages,
      containsFiles: ctx.input.containsFiles,
      includeNoteContent: ctx.input.includeNoteContent
    });

    let notes = response.results.map(note => ({
      noteId: note.id,
      title: note.title,
      content: note.content,
      snippet: note.snippet ?? null,
      collectionIds: note.collection_ids,
      createdAt: note.created_at,
      updatedAt: note.updated_at
    }));

    return {
      output: {
        notes,
        total: response.total,
        nextPage: response.next_page
      },
      message: `Found **${response.total}** note(s). Returned **${notes.length}** in this page.`
    };
  })
  .build();
