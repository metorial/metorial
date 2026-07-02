import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update an existing note's title, content, or attributes. Provide only the fields you want to change — omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      noteId: z.string().describe('ID of the note to update'),
      title: z.string().optional().describe('New title for the note'),
      markdown: z.string().optional().describe('New markdown content for the note'),
      html: z.string().optional().describe('New HTML content (alternative to markdown)'),
      attributes: z
        .array(z.string())
        .optional()
        .describe('Updated collection attributes ordered by column')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the updated note'),
      title: z.string().describe('Title of the updated note'),
      url: z.string().describe('URL to view the note in Slite'),
      updatedAt: z.string().describe('Timestamp of last update'),
      lastEditedAt: z.string().describe('Timestamp of last content edit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let note = await client.updateNote(ctx.input.noteId, {
      title: ctx.input.title,
      markdown: ctx.input.markdown,
      html: ctx.input.html,
      attributes: ctx.input.attributes
    });

    return {
      output: {
        noteId: note.id,
        title: note.title,
        url: note.url,
        updatedAt: note.updatedAt,
        lastEditedAt: note.lastEditedAt
      },
      message: `Updated note **${note.title}**`
    };
  })
  .build();
