import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

let noteOutputSchema = z.object({
  noteId: z.string().describe('The note ID'),
  parentObject: z.string().describe('Parent object slug'),
  parentRecordId: z.string().describe('Parent record ID'),
  title: z.string().describe('Note title'),
  contentPlaintext: z.string().optional().describe('Plaintext content of the note'),
  contentMarkdown: z.string().optional().describe('Markdown content of the note'),
  createdAt: z.string().describe('When the note was created')
});

let mapNote = (n: any) => ({
  noteId: n.id?.note_id ?? '',
  parentObject: n.parent_object ?? '',
  parentRecordId: n.parent_record_id ?? '',
  title: n.title ?? '',
  contentPlaintext: n.content_plaintext,
  contentMarkdown: n.content_markdown,
  createdAt: n.created_at ?? ''
});

export let listNotesTool = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes, optionally filtered by a specific record. Returns note titles and content. Useful for retrieving all notes attached to a person, company, or other record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parentObject: z
        .string()
        .optional()
        .describe('Filter by parent object slug (e.g. "people", "companies")'),
      parentRecordId: z.string().optional().describe('Filter by parent record ID'),
      limit: z.number().optional().default(10).describe('Maximum notes to return (max 50)'),
      offset: z.number().optional().default(0).describe('Number of notes to skip')
    })
  )
  .output(
    z.object({
      notes: z.array(noteOutputSchema).describe('Notes'),
      count: z.number().describe('Number of notes returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let notes = await client.listNotes({
      parentObject: ctx.input.parentObject,
      parentRecordId: ctx.input.parentRecordId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = notes.map(mapNote);

    return {
      output: { notes: mapped, count: mapped.length },
      message: `Found **${mapped.length}** note(s).`
    };
  })
  .build();

export let createNoteTool = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note attached to a record. Notes can contain markdown-formatted content. Specify the parent object and record to attach the note to.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      parentObject: z.string().describe('Parent object slug (e.g. "people", "companies")'),
      parentRecordId: z.string().describe('Parent record ID to attach the note to'),
      title: z.string().describe('Note title'),
      content: z.string().optional().describe('Note body content'),
      format: z
        .enum(['plaintext', 'markdown'])
        .optional()
        .default('plaintext')
        .describe('Content format')
    })
  )
  .output(noteOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let note = await client.createNote({
      parentObject: ctx.input.parentObject,
      parentRecordId: ctx.input.parentRecordId,
      title: ctx.input.title,
      content: ctx.input.content,
      format: ctx.input.format
    });

    let output = mapNote(note);

    return {
      output,
      message: `Created note **"${output.title}"** on record **${ctx.input.parentRecordId}**.`
    };
  })
  .build();

export let deleteNoteTool = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Permanently delete a note. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      noteId: z.string().describe('The note ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the note was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    await client.deleteNote(ctx.input.noteId);

    return {
      output: { deleted: true },
      message: `Deleted note **${ctx.input.noteId}**.`
    };
  })
  .build();
