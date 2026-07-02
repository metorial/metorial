import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note in CentralStationCRM. Notes can be attached to a person, company, deal, or project to record communication history and important information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Content/text of the note'),
      attachableType: z
        .enum(['Person', 'Company', 'Deal', 'Project'])
        .describe('Type of object to attach the note to'),
      attachableId: z.number().describe('ID of the object to attach the note to')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the created note'),
      content: z.string().optional().describe('Note content'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.createNote({
      content: ctx.input.content,
      attachable_type: ctx.input.attachableType,
      attachable_id: ctx.input.attachableId
    });

    let note = result?.action ?? result;

    return {
      output: {
        noteId: note.id,
        content: note.content,
        createdAt: note.created_at
      },
      message: `Created note on ${ctx.input.attachableType} (ID: ${ctx.input.attachableId}).`
    };
  })
  .build();
