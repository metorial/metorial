import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let manageSnapshots = SlateTool.create(spec, {
  name: 'Manage Snapshots',
  key: 'manage_snapshots',
  description: `Creates, lists, deletes, or recovers collection snapshots. Snapshots are tar archive files containing collection data and configuration. Use them for backups, data archiving, or replicating deployments. Supports both collection-level and full storage snapshots.`,
  instructions: [
    'For `create`: creates a new snapshot. Provide `collectionName` (omit for full storage snapshot).',
    'For `list`: lists available snapshots. Provide `collectionName` (omit for full storage snapshots).',
    'For `delete`: deletes a snapshot. Provide `collectionName` and `snapshotName` (omit collectionName for full storage snapshots).',
    'For `recover`: recovers a collection from a snapshot URL or path. Provide `collectionName` and `snapshotLocation`.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'delete', 'recover'])
        .describe('Snapshot operation to perform'),
      collectionName: z
        .string()
        .optional()
        .describe('Collection name (omit for full storage snapshots)'),
      snapshotName: z.string().optional().describe('Snapshot name (required for delete)'),
      snapshotLocation: z
        .string()
        .optional()
        .describe('URL or file path of the snapshot to recover from (required for recover)'),
      recoveryPriority: z
        .enum(['no_sync', 'snapshot', 'replica'])
        .optional()
        .describe('Conflict resolution priority during recovery'),
      wait: z.boolean().optional().describe('Wait for operation to complete (default: true)')
    })
  )
  .output(
    z.object({
      snapshot: z
        .object({
          snapshotName: z.string().describe('Snapshot name'),
          creationTime: z.string().optional().describe('When the snapshot was created'),
          size: z.number().optional().describe('Snapshot size in bytes')
        })
        .optional()
        .describe('Created snapshot info (for create action)'),
      snapshots: z
        .array(
          z.object({
            snapshotName: z.string().describe('Snapshot name'),
            creationTime: z.string().optional().describe('When the snapshot was created'),
            size: z.number().optional().describe('Snapshot size in bytes')
          })
        )
        .optional()
        .describe('List of snapshots (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint!,
      token: ctx.auth.token
    });

    let wait = ctx.input.wait ?? true;

    if (ctx.input.action === 'create') {
      let result: any;
      if (ctx.input.collectionName) {
        result = await client.createSnapshot(ctx.input.collectionName, wait);
      } else {
        result = await client.createFullSnapshot(wait);
      }
      return {
        output: {
          snapshot: {
            snapshotName: result.name,
            creationTime: result.creation_time,
            size: result.size
          },
          success: true
        },
        message: `Snapshot \`${result.name}\` created${ctx.input.collectionName ? ` for collection \`${ctx.input.collectionName}\`` : ' (full storage)'}.`
      };
    }

    if (ctx.input.action === 'list') {
      let results: any[];
      if (ctx.input.collectionName) {
        results = await client.listSnapshots(ctx.input.collectionName);
      } else {
        results = await client.listFullSnapshots();
      }
      let snapshots = results.map((s: any) => ({
        snapshotName: s.name,
        creationTime: s.creation_time,
        size: s.size
      }));
      return {
        output: { snapshots, success: true },
        message: `Found **${snapshots.length}** snapshot(s)${ctx.input.collectionName ? ` for collection \`${ctx.input.collectionName}\`` : ' (full storage)'}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.snapshotName)
        throw new Error('snapshotName is required for delete action');
      if (ctx.input.collectionName) {
        await client.deleteSnapshot(ctx.input.collectionName, ctx.input.snapshotName, wait);
      } else {
        await client.deleteFullSnapshot(ctx.input.snapshotName, wait);
      }
      return {
        output: { success: true },
        message: `Snapshot \`${ctx.input.snapshotName}\` deleted.`
      };
    }

    if (ctx.input.action === 'recover') {
      if (!ctx.input.collectionName)
        throw new Error('collectionName is required for recover action');
      if (!ctx.input.snapshotLocation)
        throw new Error('snapshotLocation is required for recover action');
      await client.recoverSnapshot(
        ctx.input.collectionName,
        {
          location: ctx.input.snapshotLocation,
          priority: ctx.input.recoveryPriority
        },
        wait
      );
      return {
        output: { success: true },
        message: `Collection \`${ctx.input.collectionName}\` recovered from snapshot.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
