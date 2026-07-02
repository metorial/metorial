import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let addNote = SlateTool.create(spec, {
  name: 'Add Note',
  key: 'add_note',
  description: `Add a note to a contact, account, or lead in Nutshell CRM. Notes are used to record important information and interactions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['Contacts', 'Accounts', 'Leads'])
        .describe('Type of entity to add the note to'),
      entityId: z.number().describe('ID of the entity to add the note to'),
      body: z.string().describe('Text content of the note')
    })
  )
  .output(
    z.object({
      noteId: z.number().optional().describe('ID of the created note'),
      entityType: z.string().describe('Entity type the note was added to'),
      entityId: z.number().describe('Entity ID the note was added to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.newNote(
      { entityType: ctx.input.entityType, id: ctx.input.entityId },
      ctx.input.body
    );

    return {
      output: {
        noteId: result?.id,
        entityType: ctx.input.entityType,
        entityId: ctx.input.entityId
      },
      message: `Added note to ${ctx.input.entityType} (ID: ${ctx.input.entityId}).`
    };
  })
  .build();
