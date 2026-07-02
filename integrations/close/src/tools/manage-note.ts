import { SlateTool } from 'slates';
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
      leadId: z.string().describe('Lead ID the note is attached to'),
      note: z.string().describe('The note content/body text'),
      userId: z.string().optional().describe('User ID who created/updated the note'),
      contactId: z.string().optional().describe('Contact ID associated with the note'),
      dateCreated: z.string().describe('ISO 8601 timestamp when the note was created'),
      dateUpdated: z.string().describe('ISO 8601 timestamp when the note was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let isUpdate = !!ctx.input.noteId;
    let result: any;

    if (isUpdate) {
      let updateData: Record<string, any> = {
        note: ctx.input.note
      };
      if (ctx.input.leadId) updateData.lead_id = ctx.input.leadId;
      if (ctx.input.contactId) updateData.contact_id = ctx.input.contactId;

      result = await client.updateNote(ctx.input.noteId!, updateData);
    } else {
      if (!ctx.input.leadId) {
        throw new Error('leadId is required when creating a new note');
      }

      let createData: Record<string, any> = {
        lead_id: ctx.input.leadId,
        note: ctx.input.note
      };
      if (ctx.input.contactId) createData.contact_id = ctx.input.contactId;

      result = await client.createNote(createData);
    }

    return {
      output: {
        noteId: result.id,
        leadId: result.lead_id,
        note: result.note,
        userId: result.user_id,
        contactId: result.contact_id,
        dateCreated: result.date_created,
        dateUpdated: result.date_updated
      },
      message: isUpdate
        ? `Updated note \`${result.id}\` on lead \`${result.lead_id}\`.`
        : `Created note \`${result.id}\` on lead \`${result.lead_id}\`.`
    };
  })
  .build();
