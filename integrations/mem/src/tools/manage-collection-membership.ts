import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export const manageCollectionMembership = SlateTool.create(spec, {
  name: 'Manage Collection Membership',
  key: 'manage_collection_membership',
  description:
    'Add a note to a Mem collection, remove its membership, or move it between collections and read back its current assignments.',
  instructions: [
    'Use exact note and collection UUIDs from discovery. For move, collectionId is the current source and targetCollectionId is a different destination.',
    'Membership changes leave note content intact. Move adds the destination before removing the source; failures may leave a partial change. Inspect get_note before retrying; no rollback is implied.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'move']),
      noteId: z.string().describe('Exact UUID of the note whose membership changes.'),
      collectionId: z
        .string()
        .describe('Collection UUID to add or remove; the current source collection for move.'),
      targetCollectionId: z
        .string()
        .optional()
        .describe('Required only for move: a different destination collection UUID.')
    })
  )
  .output(
    z.object({
      action: z.enum(['add', 'remove', 'move']),
      noteId: z.string(),
      collectionId: z.string(),
      targetCollectionId: z.string().optional(),
      collectionIds: z.array(z.string()),
      requestId: z
        .string()
        .describe('Native request receipt paired with an exact current note readback.')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new MemClient({ token: ctx.auth.token }).manageCollectionMembership(
      ctx.input
    );
    return {
      output: {
        action: ctx.input.action,
        noteId: result.note.id,
        collectionId: ctx.input.collectionId.toLowerCase(),
        ...(ctx.input.targetCollectionId === undefined
          ? {}
          : { targetCollectionId: ctx.input.targetCollectionId.toLowerCase() }),
        collectionIds: result.note.collection_ids,
        requestId: result.request_id
      },
      message: `Verified current collection assignments for note ${result.note.id}.`
    };
  })
  .build();
