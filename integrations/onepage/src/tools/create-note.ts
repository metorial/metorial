import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { noteSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a note on a contact to record important information or interaction details. Notes can optionally be linked to a deal.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to add the note to'),
      text: z.string().describe('Note content text'),
      linkedDealId: z.string().optional().describe('ID of a deal to link the note to'),
      date: z.string().optional().describe('Note date (YYYY-MM-DD)')
    })
  )
  .output(noteSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let note = await client.createNote(ctx.input);

    return {
      output: note,
      message: `Created note (${note.noteId}) on contact ${note.contactId}.`
    };
  })
  .build();
