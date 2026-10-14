import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exportResponse, mapFields } from '../lib/mappers';
import type { DovetailExport } from '../lib/types';
import { spec } from '../spec';

export let getNote = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve research note metadata and custom fields. Optionally prepare its full content as a downloadable HTML or Markdown file.`,
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
      fileIds: z.array(z.string()).optional().describe('Associated file IDs for get_file.'),
      content: z.string().optional(),
      previewText: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      projectTitle: z.string().nullable().optional(),
      authors: z.array(z.string()).optional(),
      createdAt: z.string(),
      updatedAt: z.string().optional(),
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

    let exportedContent: DovetailExport | undefined;
    if (ctx.input.exportFormat) {
      exportedContent = await client.exportNote(ctx.input.noteId, ctx.input.exportFormat);
      await ctx.addAttachment({
        type: 'content',
        content: exportResponse(exportedContent, ctx.input.exportFormat),
        filename: `dovetail-note-${encodeURIComponent(note.id)}.${ctx.input.exportFormat === 'html' ? 'html' : 'md'}`
      });
    }

    return {
      output: {
        noteId: note.id,
        title: note.title,
        fileIds: note.files?.map(file => file.id),
        content: note.content,
        previewText: note.preview_text ?? null,
        projectId: note.project?.id ?? note.project_id ?? null,
        projectTitle: note.project?.title ?? note.project_title ?? null,
        authors: note.authors,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        fields: mapFields(note.fields),
        exportedContent
      },
      message: `Retrieved note **${note.title}**${ctx.input.exportFormat ? ` (exported as ${ctx.input.exportFormat})` : ''}.`
    };
  })
  .build();
