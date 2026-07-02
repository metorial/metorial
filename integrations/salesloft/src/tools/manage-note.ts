import { SlateTool } from 'slates';
import { z } from 'zod';
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

let mapNote = (raw: any) => ({
  noteId: raw.id,
  content: raw.content,
  associatedWithType: raw.associated_with_type,
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
      callId: z.number().optional().describe('ID of a call to associate the note with')
    })
  )
  .output(noteOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      content: ctx.input.content,
      associated_with_type: ctx.input.associatedWithType,
      associated_with_id: ctx.input.associatedWithId
    };
    if (ctx.input.callId) body.call_id = ctx.input.callId;

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
      personId: z.number().optional().describe('Filter by associated person ID')
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
