import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addNote = SlateTool.create(spec, {
  name: 'Add Note',
  key: 'add_note',
  description: `Add an internal note to a suggestion. Notes are only visible to admins and team members, not to end users. Use this for internal discussion and context on feedback.`
})
  .input(
    z.object({
      suggestionId: z.number().describe('ID of the suggestion to add the note to'),
      body: z.string().describe('The note content')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the created note'),
      body: z.string().describe('Content of the note'),
      suggestionId: z.number().describe('ID of the suggestion'),
      createdAt: z.string().describe('When the note was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let note = await client.createNote(ctx.input.suggestionId, ctx.input.body);

    return {
      output: {
        noteId: note.id,
        body: note.body,
        suggestionId: ctx.input.suggestionId,
        createdAt: note.created_at
      },
      message: `Added internal note to suggestion ${ctx.input.suggestionId}.`
    };
  })
  .build();
