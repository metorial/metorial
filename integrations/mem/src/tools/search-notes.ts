import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let searchNotes = SlateTool.create(spec, {
  name: 'Search Notes',
  key: 'search_notes',
  description: `Search across your Mem notes using a text query. Returns relevance-ranked results with snippets. Can filter by collections, task status, images, or file attachments.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Text query to search notes for.'),
      filterByCollectionIds: z
        .array(z.string())
        .optional()
        .describe('Only return notes belonging to these collections.'),
      filterByContainsOpenTasks: z
        .boolean()
        .optional()
        .describe('Only return notes with open tasks.'),
      filterByContainsTasks: z
        .boolean()
        .optional()
        .describe('Only return notes with any tasks.'),
      filterByContainsImages: z
        .boolean()
        .optional()
        .describe('Only return notes with images.'),
      filterByContainsFiles: z
        .boolean()
        .optional()
        .describe('Only return notes with file attachments.'),
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
            snippet: z
              .string()
              .nullable()
              .describe('Relevance snippet from the note content.'),
            collectionIds: z
              .array(z.string())
              .describe('IDs of collections the note belongs to.'),
            createdAt: z.string().describe('Creation timestamp in ISO 8601 format.'),
            updatedAt: z.string().describe('Last updated timestamp in ISO 8601 format.')
          })
        )
        .describe('Relevance-ranked list of matching notes.'),
      total: z.number().describe('Total number of matching notes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.searchNotes({
      query: ctx.input.query,
      filterByCollectionIds: ctx.input.filterByCollectionIds,
      filterByContainsOpenTasks: ctx.input.filterByContainsOpenTasks,
      filterByContainsTasks: ctx.input.filterByContainsTasks,
      filterByContainsImages: ctx.input.filterByContainsImages,
      filterByContainsFiles: ctx.input.filterByContainsFiles,
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
        total: response.total
      },
      message: `Found **${response.total}** note(s) matching the search.`
    };
  })
  .build();
