import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export const updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description:
    'Replace a Mem note with the complete desired markdown body using its exact current content version.',
  instructions: [
    'Read get_note first and review its full content and version. Submit that exact version; stale versions are refused. Never refresh the version automatically to overwrite unseen changes.',
    'The first line becomes the title. Trashed notes must be restored in Mem before updating. If a write response is uncertain, inspect the exact note before retrying.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      noteId: z.string().describe('Exact note UUID from get_note.'),
      content: z
        .string()
        .describe(
          'Complete desired markdown body, up to 200,000 characters; this replaces the existing body.'
        ),
      version: z
        .number()
        .describe('Exact current integer content version from get_note, at least 1.'),
      updatedAt: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Optional ISO 8601 modification timestamp with timezone offset; omission uses server time.'
        )
    })
  )
  .output(
    z.object({
      noteId: z.string(),
      title: z.string(),
      content: z.string(),
      collectionIds: z.array(z.string()),
      createdAt: z.string(),
      updatedAt: z.string(),
      version: z.number(),
      trashedAt: z.string().nullable(),
      requestId: z
        .string()
        .describe('Native request receipt; inspect the note before retrying uncertain writes.')
    })
  )
  .handleInvocation(async ctx => {
    const note = await new MemClient({ token: ctx.auth.token }).updateNote(ctx.input);
    return {
      output: {
        noteId: note.id,
        title: note.title,
        content: note.content,
        collectionIds: note.collection_ids,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        version: note.version,
        trashedAt: note.trashed_at,
        requestId: note.request_id
      },
      message: `Updated note **${note.title}** (${note.id}); current version ${note.version}.`
    };
  })
  .build();
