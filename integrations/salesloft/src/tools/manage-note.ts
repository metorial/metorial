import { SlateTool } from 'slates';
import { z } from 'zod';
import type { noteSchema } from '../lib/api-schemas';
import { Client } from '../lib/client';
import { spec } from '../spec';

let noteOutputSchema = z.object({
  noteId: z.number().describe('SalesLoft note ID'),
  content: z.string().nullable().optional().describe('Note content/body'),
  associatedWithType: z
    .string()
    .nullable()
    .optional()
    .describe('Type of associated resource (e.g., "person", "account")'),
  associatedWithId: z.number().nullable().optional().describe('ID of the associated resource'),
  userId: z.number().nullable().optional().describe('Author user ID'),
  callId: z.number().nullable().optional().describe('Associated call ID'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

let mapNote = (raw: z.output<typeof noteSchema>) => ({
  noteId: raw.id,
  content: raw.content,
  associatedWithType: raw.associated_type,
  associatedWithId: raw.associated_with?.id ?? null,
  userId: raw.user?.id ?? null,
  callId: raw.call?.id ?? null,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note in SalesLoft. Notes can be associated with a person or account and can optionally be linked to a call.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Note content/body text'),
      associatedWithType: z
        .enum(['person', 'account'])
        .describe('Type of resource to associate the note with'),
      associatedWithId: z
        .number()
        .describe('ID of the person or account to associate the note with'),
      callId: z.number().optional().describe('ID of a call to associate the note with'),
      skipCrmSync: z
        .boolean()
        .optional()
        .describe('Prevent this note from being synchronized to the connected CRM when true.')
    })
  )
  .output(noteOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, unknown> = {
      content: ctx.input.content,
      associated_with_type: ctx.input.associatedWithType,
      associated_with_id: ctx.input.associatedWithId
    };
    if (ctx.input.callId !== undefined) body.call_id = ctx.input.callId;
    if (ctx.input.skipCrmSync !== undefined) body.skip_crm_sync = ctx.input.skipCrmSync;

    let note = await client.createNote(body);
    let output = mapNote(note);

    return {
      output,
      message: `Created note (ID: ${output.noteId}) for ${ctx.input.associatedWithType} ${ctx.input.associatedWithId}.`
    };
  })
  .build();

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update an existing note's content in SalesLoft.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z.number().describe('ID of the note to update'),
      content: z.string().describe('Updated note content/body text')
    })
  )
  .output(noteOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let note = await client.updateNote(ctx.input.noteId, {
      content: ctx.input.content
    });
    let output = mapNote(note);

    return {
      output,
      message: `Updated note ${output.noteId}.`
    };
  })
  .build();

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes in SalesLoft. Optionally filter by associated person to see all notes for a specific contact. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      personId: z.number().optional().describe('Filter by associated person ID'),
      accountId: z
        .number()
        .optional()
        .describe('Filter by associated account ID. Provide personId or accountId, not both.')
    })
  )
  .output(
    z.object({
      notes: z.array(noteOutputSchema).describe('List of notes'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listNotes(ctx.input);
    let notes = result.data.map(mapNote);

    return {
      output: {
        notes,
        paging: result.metadata.paging
      },
      message: `Found **${notes.length}** notes (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

export const getNote = SlateTool.create(spec, {
  key: 'get_note',
  name: 'Get Note',
  description: 'Fetch a note by its ID from list_notes.',
  tags: { readOnly: true }
})
  .input(z.object({ noteId: z.number().describe('Note ID from list_notes.') }))
  .output(noteOutputSchema)
  .handleInvocation(async ctx => ({
    output: mapNote(await new Client({ token: ctx.auth.token }).getNote(ctx.input.noteId)),
    message: `Retrieved note ${ctx.input.noteId}.`
  }))
  .build();
export const deleteNote = SlateTool.create(spec, {
  key: 'delete_note',
  name: 'Delete Note',
  description:
    'Delete an accessible note. This cannot be reversed without contacting Salesloft support.',
  tags: { destructive: true }
})
  .input(z.object({ noteId: z.number().describe('Note ID from list_notes or get_note.') }))
  .output(z.object({ noteId: z.number(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).deleteNote(ctx.input.noteId);
    return {
      output: { noteId: ctx.input.noteId, deleted: true },
      message: `Deleted note ${ctx.input.noteId}.`
    };
  })
  .build();
