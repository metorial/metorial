import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRecordings = SlateTool.create(spec, {
  name: 'Manage Recordings',
  key: 'manage_recordings',
  description: `List, publish, unpublish, or delete recordings for a conference room. Use action "list" to retrieve recordings, "delete" to remove a specific recording, or "delete_all" to remove all recordings for a room.`,
  instructions: [
    'Use action "list" to view all recordings for a room.',
    'Use action "delete" with a recordingId to remove a specific recording.',
    'Use action "delete_all" to remove all recordings for the room.'
  ]
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      action: z
        .enum(['list', 'delete', 'delete_all', 'publish', 'unpublish'])
        .describe('Action to perform'),
      recordingId: z
        .string()
        .optional()
        .describe(
          'ID of the specific recording to delete (required for "delete", "publish", and "unpublish" actions)'
        )
    })
  )
  .output(
    z.object({
      recordings: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of recordings (for "list" action)'),
      deleted: z.boolean().optional().describe('Whether deletion was successful'),
      publicationResult: z
        .string()
        .optional()
        .describe('Provider publication URL or unpublication confirmation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { roomId, action, recordingId } = ctx.input;

    if (action === 'list') {
      let result = await client.listRecordings(roomId);
      let recordings = result;
      return {
        output: { recordings },
        message: `Found **${recordings.length}** recording(s) for room ${roomId}.`
      };
    }

    if (action === 'publish' || action === 'unpublish') {
      if (!recordingId)
        throw createApiServiceError(
          'recordingId is required to publish or unpublish a recording.'
        );
      let publicationResult = await client.publishRecording(
        roomId,
        recordingId,
        action === 'publish'
      );
      return {
        output: { publicationResult },
        message: `${action === 'publish' ? 'Published' : 'Unpublished'} recording **${recordingId}**.`
      };
    }

    if (action === 'delete') {
      if (!recordingId) {
        throw createApiServiceError('recordingId is required when action is "delete"');
      }
      await client.deleteRecording(roomId, recordingId);
      return {
        output: { deleted: true },
        message: `Deleted recording **${recordingId}** from room ${roomId}.`
      };
    }

    // delete_all
    await client.deleteAllRecordings(roomId);
    return {
      output: { deleted: true },
      message: `Deleted all recordings for room ${roomId}.`
    };
  })
  .build();
