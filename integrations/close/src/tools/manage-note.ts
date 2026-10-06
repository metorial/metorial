import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNote = SlateTool.create(spec, {
  name: 'Manage Note',
  key: 'manage_note',
  description: `Create or update a note on a lead in Close CRM. If a noteId is provided the existing note is updated; otherwise a new note is created on the specified lead.`,
  instructions: [
    'To **create** a note, provide **leadId** and **note**. The leadId is required for creation.',
    'To **update** an existing note, provide **noteId** and any fields to change.',
    'The **note** field is the plain-text body of the note.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z
        .string()
        .optional()
        .describe('Note ID to update. If omitted, a new note is created.'),
      leadId: z
        .string()
        .optional()
        .describe('Lead ID to attach the note to (required when creating a new note)'),
      note: z.string().describe('The note content/body text'),
      contactId: z.string().optional().describe('Contact ID to associate with the note')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('Unique identifier of the note'),
      leadId: z.string().optional().describe('Lead ID the note is attached to, when provided'),
      note: z.string().describe('The note content/body text'),
      userId: z.string().optional().describe('User ID who created/updated the note'),
      contactId: z.string().optional().describe('Contact ID associated with the note'),
      dateCreated: z.string().describe('ISO 8601 timestamp when the note was created'),
      dateUpdated: z.string().describe('ISO 8601 timestamp when the note was last updated')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    if (input.noteId === undefined && input.leadId === undefined)
      throw createApiServiceError('leadId is required when creating a note.');
    const client = new Client(ctx.auth);
    const body = pickDefined({
      lead_id: input.leadId,
      contact_id: input.contactId,
      note: input.note
    });
    const note =
      input.noteId !== undefined
        ? await client.updateNote(input.noteId, body)
        : await client.createNote(body);
    return {
      output: {
        noteId: note.id,
        leadId: note.lead_id ?? undefined,
        note: note.note,
        userId: note.user_id ?? undefined,
        contactId: note.contact_id ?? undefined,
        dateCreated: note.date_created,
        dateUpdated: note.date_updated
      },
      message: `${input.noteId !== undefined ? 'Updated' : 'Created'} note **${note.id}**.`
    };
  })
  .build();
