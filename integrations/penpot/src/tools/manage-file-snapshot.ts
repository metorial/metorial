import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { makeClient } from '../lib/helpers';
import { mapSnapshot, snapshotSchema } from '../lib/snapshots';
import { spec } from '../spec';

export let manageFileSnapshotTool = SlateTool.create(spec, {
  key: 'manage_file_snapshot',
  name: 'Manage File Snapshot',
  description:
    'Save a named version of a design file, restore a saved version, or delete a user-created version. Restoring replaces the current file contents; retrieve get_file again before making further edits.',
  instructions: [
    'Call list_file_snapshots to discover snapshot IDs for restore or delete. Penpot applies file editing permissions, version quotas, and version locking rules.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'restore', 'delete']).describe('Operation to perform'),
      fileId: z.string().describe('File ID. Call list_files to discover accessible files.'),
      snapshotId: z
        .string()
        .optional()
        .describe(
          'Saved version ID from list_file_snapshots. Required for restore and delete.'
        ),
      label: z
        .string()
        .optional()
        .describe('Optional version label for create; Penpot generates a label when omitted.')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the affected file'),
      snapshotId: z.string().describe('ID of the saved, restored, or deleted version'),
      snapshot: snapshotSchema.optional().describe('Created version metadata')
    })
  )
  .handleInvocation(async ctx => {
    let { action, fileId, snapshotId, label } = ctx.input;
    let client = makeClient(ctx);
    if (action === 'create') {
      let snapshot = mapSnapshot(await client.createFileSnapshot(fileId, label));
      return {
        output: { fileId, snapshotId: snapshot.snapshotId, snapshot },
        message: 'Saved a new file version.'
      };
    }
    if (!snapshotId)
      throw createApiServiceError(
        'snapshotId is required for restore or delete. Call list_file_snapshots first.'
      );
    if (action === 'restore') {
      await client.restoreFileSnapshot(fileId, snapshotId);
      return { output: { fileId, snapshotId }, message: 'Restored the saved file version.' };
    }
    let snapshots = await client.getFileSnapshots(fileId);
    if (!snapshots.some(snapshot => snapshot.id === snapshotId)) {
      throw createApiServiceError(
        'The snapshot does not belong to this file or is no longer visible. Call list_file_snapshots again.'
      );
    }
    await client.deleteFileSnapshot(snapshotId);
    return { output: { fileId, snapshotId }, message: 'Deleted the saved file version.' };
  })
  .build();
