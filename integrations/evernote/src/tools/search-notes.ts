import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchNotesTool = SlateTool.create(spec, {
  name: 'Search Notes',
  key: 'search_notes',
  description: `Search for notes using Evernote's search grammar or filter by notebook, tags, and other criteria. Returns note metadata (title, dates, notebook, tags) without full content. Use **Get Note** to retrieve content for individual results.

Supports Evernote search operators in the \`query\` field: \`intitle:\`, \`tag:\`, \`notebook:\`, \`created:\`, \`updated:\`, \`resource:\`, \`todo:\`, quoted phrases, and negation with \`-\`.`,
  instructions: [
    'Date filters use format YYYYMMDD or relative: day, day-7, week-2, month-1, year.',
    'Use `any:` prefix for OR logic (default is AND).',
    'Max 250 notes per request. Use offset for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Search query using Evernote search grammar (e.g. "intitle:meeting tag:work")'
        ),
      notebookGuid: z.string().optional().describe('Filter results to a specific notebook'),
      tagGuids: z
        .array(z.string())
        .optional()
        .describe('Filter to notes that have all of these tags'),
      includeTrash: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include notes in the trash'),
      offset: z.number().optional().default(0).describe('Starting index for pagination'),
      maxResults: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of results (1-250)'),
      sortOrder: z
        .enum(['created', 'updated', 'relevance', 'title'])
        .optional()
        .default('updated')
        .describe('Sort order for results'),
      ascending: z.boolean().optional().default(false).describe('Sort in ascending order')
    })
  )
  .output(
    z.object({
      totalNotes: z.number().describe('Total number of notes matching the search'),
      startIndex: z.number().describe('Starting index of the returned results'),
      notes: z
        .array(
          z.object({
            noteGuid: z.string().describe('Unique identifier of the note'),
            title: z.string().optional().describe('Title of the note'),
            notebookGuid: z.string().optional().describe('GUID of the containing notebook'),
            tagGuids: z.array(z.string()).optional().describe('GUIDs of tags on this note'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the note was created'),
            updatedAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the note was last updated'),
            contentLength: z
              .number()
              .optional()
              .describe('Length of the note content in bytes')
          })
        )
        .describe('Matching notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    // Map sort order to Evernote NoteSortOrder enum values
    let sortOrderMap: Record<string, number> = {
      created: 1,
      updated: 2,
      relevance: 3,
      title: 4
    };

    let maxNotes = Math.min(Math.max(ctx.input.maxResults ?? 50, 1), 250);

    let result = await client.findNotesMetadata(
      {
        words: ctx.input.query,
        notebookGuid: ctx.input.notebookGuid,
        tagGuids: ctx.input.tagGuids,
        inactive: ctx.input.includeTrash || false,
        order: sortOrderMap[ctx.input.sortOrder || 'updated'],
        ascending: ctx.input.ascending
      },
      ctx.input.offset ?? 0,
      maxNotes,
      {
        includeTitle: true,
        includeCreated: true,
        includeUpdated: true,
        includeNotebookGuid: true,
        includeTagGuids: true,
        includeContentLength: true
      }
    );

    let notes = result.notes.map(n => ({
      noteGuid: n.noteGuid,
      title: n.title,
      notebookGuid: n.notebookGuid,
      tagGuids: n.tagGuids,
      createdAt: n.created ? new Date(n.created).toISOString() : undefined,
      updatedAt: n.updated ? new Date(n.updated).toISOString() : undefined,
      contentLength: n.contentLength
    }));

    return {
      output: {
        totalNotes: result.totalNotes,
        startIndex: result.startIndex,
        notes
      },
      message: `Found **${result.totalNotes}** note(s). Returned ${notes.length} starting at index ${result.startIndex}.`
    };
  })
  .build();
