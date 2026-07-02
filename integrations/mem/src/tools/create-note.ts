import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Create a new note in your Mem knowledge base. The note content should be markdown-formatted, where the first line is automatically used as the title. Notes can optionally be assigned to collections by ID or by title.`,
  constraints: [
    'Note content can be up to ~200,000 characters.',
    'Collection titles are matched case-insensitively. Non-existent collection titles are silently ignored.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      content: z
        .string()
        .describe(
          'Markdown-formatted note content. The first line (e.g. "# Title") becomes the note title.'
        ),
      noteId: z.string().optional().describe('Optional custom UUID for the note.'),
      collectionIds: z
        .array(z.string())
        .optional()
        .describe('Collection IDs to assign the note to.'),
      collectionTitles: z
        .array(z.string())
        .optional()
        .describe('Collection titles to assign the note to (case-insensitive exact match).'),
      createdAt: z
        .string()
        .optional()
        .describe('Custom creation timestamp in ISO 8601 format.'),
      updatedAt: z.string().optional().describe('Custom updated timestamp in ISO 8601 format.')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('Unique ID of the created note.'),
      title: z.string().describe('Title of the created note.'),
      content: z.string().nullable().describe('Full markdown content of the note.'),
      collectionIds: z.array(z.string()).describe('IDs of collections the note belongs to.'),
      createdAt: z.string().describe('Creation timestamp in ISO 8601 format.'),
      updatedAt: z.string().describe('Last updated timestamp in ISO 8601 format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let note = await client.createNote({
      content: ctx.input.content,
      noteId: ctx.input.noteId,
      collectionIds: ctx.input.collectionIds,
      collectionTitles: ctx.input.collectionTitles,
      createdAt: ctx.input.createdAt,
      updatedAt: ctx.input.updatedAt
    });

    return {
      output: {
        noteId: note.id,
        title: note.title,
        content: note.content,
        collectionIds: note.collection_ids,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      },
      message: `Created note **${note.title}** (${note.id}).`
    };
  })
  .build();
