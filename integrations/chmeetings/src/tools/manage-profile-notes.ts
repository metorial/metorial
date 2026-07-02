import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProfileNotes = SlateTool.create(spec, {
  name: 'List Profile Notes',
  key: 'list_profile_notes',
  description: `Retrieve all public notes for a specific person. Returns paginated profile notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person whose notes to retrieve'),
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      notes: z.array(z.record(z.string(), z.unknown())).describe('List of profile notes'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      total: z.number().describe('Total number of notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProfileNotes(ctx.input.personId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        notes: result.data as Record<string, unknown>[],
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** note(s) for person ID **${ctx.input.personId}**.`
    };
  })
  .build();

export let createProfileNote = SlateTool.create(spec, {
  name: 'Create Profile Note',
  key: 'create_profile_note',
  description: `Add a new note to a person's profile in ChMeetings.`
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to add the note to'),
      note: z.string().describe('Note text content')
    })
  )
  .output(
    z.object({
      profileNote: z.record(z.string(), z.unknown()).describe('Created profile note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createProfileNote(ctx.input.personId, {
      note: ctx.input.note
    });

    return {
      output: {
        profileNote: result.data as Record<string, unknown>
      },
      message: `Added note to person ID **${ctx.input.personId}**.`
    };
  })
  .build();

export let updateProfileNote = SlateTool.create(spec, {
  name: 'Update Profile Note',
  key: 'update_profile_note',
  description: `Update an existing note on a person's profile.`
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person who owns the note'),
      noteId: z.number().describe('ID of the note to update'),
      note: z.string().describe('Updated note text content')
    })
  )
  .output(
    z.object({
      profileNote: z.record(z.string(), z.unknown()).describe('Updated profile note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateProfileNote(ctx.input.personId, ctx.input.noteId, {
      note: ctx.input.note
    });

    return {
      output: {
        profileNote: result.data as Record<string, unknown>
      },
      message: `Updated note **${ctx.input.noteId}** for person ID **${ctx.input.personId}**.`
    };
  })
  .build();

export let deleteProfileNote = SlateTool.create(spec, {
  name: 'Delete Profile Note',
  key: 'delete_profile_note',
  description: `Delete a note from a person's profile. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person who owns the note'),
      noteId: z.number().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteProfileNote(ctx.input.personId, ctx.input.noteId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted note **${ctx.input.noteId}** from person ID **${ctx.input.personId}**.`
    };
  })
  .build();
