import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Creates a new note attached to a person, company, or deal. Notes support plain text or markdown content and can be public or private. You can also create reply threads by specifying a parent note.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entityId: z
        .string()
        .describe('ID of the person, company, or deal to attach the note to'),
      content: z.string().describe('Note content (plain text or markdown)'),
      visibility: z.enum(['public', 'private']).describe('Note visibility'),
      parentNoteId: z
        .string()
        .optional()
        .describe('Parent note ID for creating a reply thread')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the created note'),
      entityId: z.string().describe('Entity the note is attached to'),
      entityType: z.string().describe('Type of entity (person, company, etc.)'),
      content: z.string().describe('Note content'),
      visibility: z.string().describe('Visibility setting'),
      authorName: z.string().describe('Author name'),
      authorEmail: z.string().describe('Author email'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: {
      entity: { id: string };
      content: string;
      visibility: 'public' | 'private';
      parentNote?: { id: string };
    } = {
      entity: { id: ctx.input.entityId },
      content: ctx.input.content,
      visibility: ctx.input.visibility
    };

    if (ctx.input.parentNoteId) {
      input.parentNote = { id: ctx.input.parentNoteId };
    }

    let note = await client.createNote(input);

    return {
      output: {
        noteId: note.id,
        entityId: note.entity.id,
        entityType: note.entity.entityType,
        content: note.content,
        visibility: note.visibility,
        authorName: note.author.fullName,
        authorEmail: note.author.email,
        createdAt: note.createdAt
      },
      message: `Created ${note.visibility} note on ${note.entity.entityType} **${note.entity.fullName}**`
    };
  })
  .build();
