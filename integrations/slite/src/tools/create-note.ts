import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note (document) in the Slite workspace. Notes can be placed under a parent note for organization, created from templates, and include markdown or HTML content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the note'),
      markdown: z.string().optional().describe('Markdown content for the note body'),
      html: z
        .string()
        .optional()
        .describe('HTML content for the note body (alternative to markdown)'),
      parentNoteId: z
        .string()
        .optional()
        .describe(
          'ID of the parent note to nest this note under. If omitted, the note goes to the personal channel.'
        ),
      templateId: z.string().optional().describe('ID of a template to apply to the new note'),
      attributes: z
        .array(z.string())
        .optional()
        .describe('Collection attributes ordered by column')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the created note'),
      title: z.string().describe('Title of the created note'),
      url: z.string().describe('URL to view the note in Slite'),
      parentNoteId: z.string().nullable().describe('ID of the parent note'),
      updatedAt: z.string().describe('Timestamp of last update'),
      lastEditedAt: z.string().describe('Timestamp of last content edit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let note = await client.createNote({
      title: ctx.input.title,
      markdown: ctx.input.markdown,
      html: ctx.input.html,
      parentNoteId: ctx.input.parentNoteId,
      templateId: ctx.input.templateId,
      attributes: ctx.input.attributes
    });

    return {
      output: {
        noteId: note.id,
        title: note.title,
        url: note.url,
        parentNoteId: note.parentNoteId ?? null,
        updatedAt: note.updatedAt,
        lastEditedAt: note.lastEditedAt
      },
      message: `Created note **${note.title}** — [View in Slite](${note.url})`
    };
  })
  .build();
