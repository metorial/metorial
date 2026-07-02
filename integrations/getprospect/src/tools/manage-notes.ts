import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.string().optional().describe('Unique identifier for the note'),
  leadId: z.string().optional().describe('ID of the associated lead'),
  content: z.string().optional().describe('Note content')
});

export let getNote = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a single note by ID, or list all notes with pagination. Notes can be attached to leads for tracking interactions and information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteId: z
        .string()
        .optional()
        .describe('ID of a specific note to retrieve. If omitted, lists all notes.'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      note: noteSchema.optional().describe('Single note (when noteId is provided)'),
      notes: z.array(noteSchema).optional().describe('List of notes (when listing)'),
      totalCount: z.number().optional().describe('Total count when listing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.noteId) {
      let result = await client.getNote(ctx.input.noteId);
      return {
        output: {
          note: {
            noteId: result.id ?? result.note_id,
            leadId: result.lead_id,
            content: result.content
          }
        },
        message: `Retrieved note **${ctx.input.noteId}**.`
      };
    }

    let result = await client.getNotes({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let notes = result.data ?? result.notes ?? result ?? [];
    let notesArray = Array.isArray(notes) ? notes : [];

    return {
      output: {
        notes: notesArray.map((note: any) => ({
          noteId: note.id ?? note.note_id,
          leadId: note.lead_id,
          content: note.content
        })),
        totalCount: result.total ?? result.totalCount
      },
      message: `Found **${notesArray.length}** note(s).`
    };
  })
  .build();

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note, optionally attached to a lead. Use notes to track interactions, observations, or follow-up reminders.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Content of the note'),
      leadId: z.string().optional().describe('ID of the lead to attach the note to')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createNote({
      content: ctx.input.content,
      leadId: ctx.input.leadId
    });

    return {
      output: {
        noteId: result.id ?? result.note_id,
        leadId: result.lead_id ?? ctx.input.leadId,
        content: result.content ?? ctx.input.content
      },
      message: `Created note${ctx.input.leadId ? ` on lead **${ctx.input.leadId}**` : ''}.`
    };
  })
  .build();

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update the content of an existing note.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to update'),
      content: z.string().describe('New content for the note')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateNote(ctx.input.noteId, {
      content: ctx.input.content
    });

    return {
      output: {
        noteId: result.id ?? result.note_id ?? ctx.input.noteId,
        leadId: result.lead_id,
        content: result.content ?? ctx.input.content
      },
      message: `Updated note **${ctx.input.noteId}**.`
    };
  })
  .build();

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently delete a note from GetProspect. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteNote(ctx.input.noteId);

    return {
      output: { success: true },
      message: `Deleted note **${ctx.input.noteId}**.`
    };
  })
  .build();
