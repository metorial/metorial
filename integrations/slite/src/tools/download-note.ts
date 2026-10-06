import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/schemas';
import { spec } from '../spec';

export let downloadNote = SlateTool.create(spec, {
  name: 'Download Note',
  key: 'download_note',
  description:
    'Download one exact note as Markdown, HTML, or native SliteML. SliteML preserves rich block types; Markdown and HTML can lose native editing structure. The file contains the current readable note, without child-note recursion or historical-version guarantees.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      noteId: z.string().describe('Exact note ID from get_note, list_notes, or search_notes.'),
      format: z.enum(['md', 'html', 'sliteml']).optional().default('md'),
      css: z
        .enum(['inline', 'none'])
        .optional()
        .describe('HTML stylesheet representation; applies only to html.'),
      compact: z
        .boolean()
        .optional()
        .describe('Compact native serialization; applies only to sliteml.')
    })
  )
  .output(
    z.object({
      noteId: z.string(),
      title: z.string(),
      url: z.string(),
      updatedAt: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number().int().nonnegative()
    })
  )
  .handleInvocation(async ctx => {
    let note = await new Client(ctx.auth.token).getNote(ctx.input.noteId, ctx.input.format, {
      css: ctx.input.css,
      compact: ctx.input.compact
    });
    let bytes = Buffer.from(note.content, 'utf8');
    if (bytes.byteLength > 16 * 1024 * 1024)
      throw invalid(
        'This note exceeds the 16 MiB downloadable-file limit. Read a smaller note or use the provider application.'
      );
    let filename = `note.${ctx.input.format}`;
    let mimeType =
      ctx.input.format === 'html'
        ? 'text/html; charset=utf-8'
        : ctx.input.format === 'md'
          ? 'text/markdown; charset=utf-8'
          : 'text/plain; charset=utf-8';
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(bytes), { headers: { 'content-type': mimeType } }),
      filename,
      mimeType
    });
    return {
      output: {
        noteId: note.id,
        title: note.title,
        url: note.url,
        updatedAt: note.updatedAt,
        filename,
        mimeType,
        sizeBytes: bytes.byteLength
      },
      message: 'Prepared the current note for download.'
    };
  })
  .build();
