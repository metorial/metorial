import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.number().describe('Note ID'),
  noteBody: z.string().describe('Note content'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  creatorName: z.string().nullable().optional().describe('Name of the note creator'),
  creatorEmail: z.string().nullable().optional().describe('Email of the note creator')
});

export let listContactNotes = SlateTool.create(spec, {
  name: 'List Contact Notes',
  key: 'list_contact_notes',
  description: `Retrieve all notes attached to a specific contact. The contact is identified by email or phone number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactIdentifier: z.string().describe('Contact email address or phone number')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).describe('List of notes for the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listContactNotes(ctx.input.contactIdentifier);
    let notes = (Array.isArray(result) ? result : result.notes || []).map((n: any) => ({
      noteId: n.id,
      noteBody: n.note || n.body,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
      creatorName: n.creator?.name,
      creatorEmail: n.creator?.email
    }));

    return {
      output: { notes },
      message: `Found **${notes.length}** notes for contact **${ctx.input.contactIdentifier}**.`
    };
  })
  .build();

export let createContactNote = SlateTool.create(spec, {
  name: 'Create Contact Note',
  key: 'create_contact_note',
  description: `Add a new note to a specific contact. The contact is identified by email or phone number.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactIdentifier: z.string().describe('Contact email address or phone number'),
      noteBody: z.string().describe('Note content to add')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.createContactNote(
      ctx.input.contactIdentifier,
      ctx.input.noteBody
    );
    let n = result.note || result;

    return {
      output: {
        noteId: n.id,
        noteBody: n.note || n.body || ctx.input.noteBody,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
        creatorName: n.creator?.name,
        creatorEmail: n.creator?.email
      },
      message: `Created note for contact **${ctx.input.contactIdentifier}**.`
    };
  })
  .build();

export let deleteContactNote = SlateTool.create(spec, {
  name: 'Delete Contact Note',
  key: 'delete_contact_note',
  description: `Delete a specific note from a contact by its note ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.number().describe('The ID of the note to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the note was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    await client.deleteContactNote(ctx.input.noteId);

    return {
      output: { deleted: true },
      message: `Deleted note **${ctx.input.noteId}**.`
    };
  })
  .build();
