import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNote = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a specific research note with its full content, fields, and metadata. Optionally export the note as HTML or Markdown.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('The note ID to retrieve'),
      exportFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Optionally export the note in this format')
    })
  )
  .output(
    z.object({
      noteId: z.string(),
      title: z.string(),
      content: z.string().optional(),
      previewText: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      projectTitle: z.string().nullable().optional(),
      authors: z.array(z.string()).optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      fields: z
        .array(
          z.object({
            label: z.string(),
            value: z.string().nullable()
          })
        )
        .optional(),
      exportedContent: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let note = await client.getNote(ctx.input.noteId);

    let exportedContent: any;
    if (ctx.input.exportFormat) {
      exportedContent = await client.exportNote(ctx.input.noteId, ctx.input.exportFormat);
    }

    return {
      output: {
        noteId: note.id,
        title: note.title,
        content: note.content,
        previewText: note.preview_text ?? null,
        projectId: note.project_id ?? null,
        projectTitle: note.project_title ?? null,
        authors: note.authors,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        fields: note.fields,
        exportedContent
      },
      message: `Retrieved note **${note.title}**${ctx.input.exportFormat ? ` (exported as ${ctx.input.exportFormat})` : ''}.`
    };
  })
  .build();
