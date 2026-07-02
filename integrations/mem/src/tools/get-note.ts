import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let getNote = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a specific note by its ID, including its full content, title, and collection assignments.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('The UUID of the note to retrieve.')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('Unique ID of the note.'),
      title: z.string().describe('Title of the note.'),
      content: z.string().nullable().describe('Full markdown content of the note.'),
      collectionIds: z.array(z.string()).describe('IDs of collections the note belongs to.'),
      createdAt: z.string().describe('Creation timestamp in ISO 8601 format.'),
      updatedAt: z.string().describe('Last updated timestamp in ISO 8601 format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let note = await client.getNote(ctx.input.noteId);

    return {
      output: {
        noteId: note.id,
        title: note.title,
        content: note.content,
        collectionIds: note.collection_ids,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      },
      message: `Retrieved note **${note.title}** (${note.id}).`
    };
  })
  .build();
