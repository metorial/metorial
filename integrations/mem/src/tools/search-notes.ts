import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let searchNotes = SlateTool.create(spec, {
  name: 'Search Notes',
  key: 'search_notes',
  description: `Search across your Mem notes using a text query. Returns relevance-ranked results with snippets. Can filter by collections, task status, images, or file attachments.`,
  instructions: [
    'Supply a non-whitespace query; the historical optional query field is retained for compatibility. Use list_notes for exhaustive chronological discovery.',
    'Search is bounded to a 100-result snapshot. Later offsets require the returned snapshotId and the same query/filters. Multiple true task/image/file filters use OR semantics.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Required non-whitespace text query. Use list_notes when no text query is available.'
        ),
      limit: z.number().optional().describe('Search page size from 1 through 50; default 20.'),
      offset: z
        .number()
        .optional()
        .describe('Zero-based search offset. Later pages require snapshotId.'),
      snapshotId: z
        .string()
        .optional()
        .describe(
          'UUID returned by the first search page; reuse with the same query and filters.'
        ),
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
      total: z
        .number()
        .describe('Matching notes in the bounded search snapshot, capped at 100.'),
      snapshotId: z.string().optional().describe('Search snapshot UUID for subsequent pages.'),
      offset: z.number().optional().describe('Offset applied to this search page.'),
      limit: z.number().optional().describe('Limit applied to this search page.'),
      hasNextPage: z
        .boolean()
        .optional()
        .describe('Whether the bounded search snapshot has another page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.searchNotes({
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      snapshotId: ctx.input.snapshotId,
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
      content: note.content ?? null,
      snippet: note.snippet ?? null,
      collectionIds: note.collection_ids,
      createdAt: note.created_at,
      updatedAt: note.updated_at
    }));

    return {
      output: {
        notes,
        total: response.total,
        snapshotId: response.snapshot_id,
        offset: response.offset,
        limit: response.limit,
        hasNextPage: response.has_next_page
      },
      message: `Found **${response.total}** note(s) matching the search.`
    };
  })
  .build();
