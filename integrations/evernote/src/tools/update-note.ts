import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildEnmlContent } from '../lib/note-content';
import { spec } from '../spec';

export let updateNoteTool = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update an existing note's title, content, tags, notebook assignment, or attributes. Only provided fields will be changed.`,
  instructions: [
    'If updating content and it does not start with "<?xml", it will be auto-wrapped in the ENML document envelope.',
    'To move a note to a different notebook, provide the target notebookGuid.',
    'When updating tagNames, the provided list replaces all existing tags on the note.'
  ]
})
  .input(
    z.object({
      noteGuid: z.string().describe('GUID of the note to update'),
      title: z.string().optional().describe('New title for the note'),
      content: z
        .string()
        .optional()
        .describe('New body content. Plain text, HTML fragment, or full ENML.'),
      notebookGuid: z.string().optional().describe('GUID of the notebook to move the note to'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Tag names to set on the note (replaces existing tags)'),
      author: z.string().optional().describe('New author for the note'),
      sourceUrl: z.string().optional().describe('New source URL for the note')
    })
  )
  .output(
    z.object({
      noteGuid: z.string().describe('GUID of the updated note'),
      title: z.string().describe('Title of the updated note'),
      updatedAt: z.string().describe('ISO timestamp of the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let content = ctx.input.content ? buildEnmlContent(ctx.input.content) : undefined;

    let note = await client.updateNote({
      noteGuid: ctx.input.noteGuid,
      title: ctx.input.title,
      content,
      notebookGuid: ctx.input.notebookGuid,
      tagNames: ctx.input.tagNames,
      attributes:
        ctx.input.author || ctx.input.sourceUrl
          ? {
              author: ctx.input.author,
              sourceUrl: ctx.input.sourceUrl
            }
          : undefined
    });

    return {
      output: {
        noteGuid: note.noteGuid || ctx.input.noteGuid,
        title: note.title || '',
        updatedAt: note.updated
          ? new Date(note.updated).toISOString()
          : new Date().toISOString()
      },
      message: `Updated note **${note.title}**.`
    };
  })
  .build();
