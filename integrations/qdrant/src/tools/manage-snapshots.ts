import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantClient } from '../lib/client';
import { spec } from '../spec';

export let manageSnapshots = SlateTool.create(spec, {
  name: 'Manage Snapshots',
  key: 'manage_snapshots',
  description: `Creates, lists, downloads, deletes, or recovers snapshots. Snapshots contain collection data and configuration for backups or recovery. Full storage snapshots require a single-node deployment and are unavailable on Qdrant Cloud.`,
  instructions: [
    'For `create`: creates a new snapshot. Provide `collectionName` (omit for full storage snapshot).',
    'For `list`: lists available snapshots. Provide `collectionName` (omit for full storage snapshots).',
    'For `download`: provide snapshotName and collectionName, or omit collectionName for a full storage snapshot.',
    'For `delete`: deletes a snapshot. Provide `collectionName` and `snapshotName` (omit collectionName for full storage snapshots).',
    'For `recover`: recovers a collection from a snapshot URL or path. Provide `collectionName` and `snapshotLocation`.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'download', 'delete', 'recover'])
        .describe('Snapshot operation to perform'),
      collectionName: z
        .string()
        .optional()
        .describe('Collection name (omit for full storage snapshots)'),
      snapshotName: z
        .string()
        .optional()
        .describe('Snapshot name (required for download or delete)'),
      snapshotLocation: z
        .string()
        .optional()
        .describe(
          'Snapshot URI for recovery: an HTTP/HTTPS URL or a local file:/// URI (required for recover)'
        ),
      recoveryPriority: z
        .enum(['no_sync', 'snapshot', 'replica'])
        .optional()
        .describe('Conflict resolution priority during recovery'),
      checksum: z
        .string()
        .optional()
        .describe('Optional SHA256 checksum to verify before recovery'),
      snapshotApiKey: z
        .string()
        .optional()
        .describe('API key required by the remote snapshot URL during recovery'),
      wait: z.boolean().optional().describe('Wait for operation to complete (default: true)')
    })
  )
  .output(
    z.object({
      snapshot: z
        .object({
          snapshotName: z.string().describe('Snapshot name'),
          creationTime: z.string().optional().describe('When the snapshot was created'),
          size: z.number().optional().describe('Snapshot size in bytes'),
          checksum: z.string().optional().describe('Snapshot SHA256 checksum, when available')
        })
        .optional()
        .describe('Snapshot info (for create or download action)'),
      snapshots: z
        .array(
          z.object({
            snapshotName: z.string().describe('Snapshot name'),
            creationTime: z.string().optional().describe('When the snapshot was created'),
            size: z.number().optional().describe('Snapshot size in bytes'),
            checksum: z
              .string()
              .optional()
              .describe('Snapshot SHA256 checksum, when available')
          })
        )
        .optional()
        .describe('List of snapshots (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new QdrantClient({
      clusterEndpoint: ctx.config.clusterEndpoint,
      token: ctx.auth.token
    });

    let wait = ctx.input.wait ?? true;
    let mapSnapshot = (snapshot: any) => ({
      snapshotName: snapshot.name,
      creationTime: snapshot.creation_time ?? undefined,
      size: snapshot.size,
      checksum: snapshot.checksum ?? undefined
    });
    let addDownload = async (snapshotName: string) => {
      let path = ctx.input.collectionName
        ? `/collections/${encodeURIComponent(ctx.input.collectionName)}/snapshots/${encodeURIComponent(snapshotName)}`
        : `/snapshots/${encodeURIComponent(snapshotName)}`;
      await ctx.addAttachment({
        type: 'url',
        url: `${client.clusterEndpoint}${path}`,
        headers: { 'api-key': ctx.auth.token },
        filename: snapshotName,
        mimeType: 'application/octet-stream'
      });
    };

    if (ctx.input.action === 'create') {
      let result: any;
      if (ctx.input.collectionName) {
        result = await client.createSnapshot(ctx.input.collectionName, wait);
      } else {
        result = await client.createFullSnapshot(wait);
      }
      if (!result?.name) {
        if (wait) {
          throw createApiServiceError(
            'Qdrant did not return the completed snapshot name. Use the list action to check snapshot status.'
          );
        }
        return {
          output: { success: true },
          message:
            'Snapshot creation started. Use the list action to find the completed snapshot.'
        };
      }
      await addDownload(result.name);
      return {
        output: {
          snapshot: mapSnapshot(result),
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
      let snapshots = results.map(mapSnapshot);
      return {
        output: { snapshots, success: true },
        message: `Found **${snapshots.length}** snapshot(s)${ctx.input.collectionName ? ` for collection \`${ctx.input.collectionName}\`` : ' (full storage)'}.`
      };
    }

    if (ctx.input.action === 'download') {
      if (!ctx.input.snapshotName)
        throw createApiServiceError('snapshotName is required for download.');
      let snapshots = ctx.input.collectionName
        ? await client.listSnapshots(ctx.input.collectionName)
        : await client.listFullSnapshots();
      let snapshot = snapshots.find(snapshot => snapshot.name === ctx.input.snapshotName);
      if (!snapshot)
        throw createApiServiceError(
          'The snapshot was not found. Use the list action to find an available snapshot.'
        );
      await addDownload(ctx.input.snapshotName);
      return {
        output: { snapshot: mapSnapshot(snapshot), success: true },
        message: `Prepared snapshot \`${ctx.input.snapshotName}\` for download.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.snapshotName)
        throw createApiServiceError('snapshotName is required for delete action');
      if (ctx.input.collectionName) {
        await client.deleteSnapshot(ctx.input.collectionName, ctx.input.snapshotName, wait);
      } else {
        await client.deleteFullSnapshot(ctx.input.snapshotName, wait);
      }
      return {
        output: { success: true },
        message: wait
          ? `Snapshot \`${ctx.input.snapshotName}\` deleted.`
          : `Snapshot \`${ctx.input.snapshotName}\` deletion started.`
      };
    }

    if (ctx.input.action === 'recover') {
      if (!ctx.input.collectionName)
        throw createApiServiceError('collectionName is required for recover action');
      if (!ctx.input.snapshotLocation)
        throw createApiServiceError('snapshotLocation is required for recover action');
      try {
        let location = new URL(ctx.input.snapshotLocation);
        if (!['http:', 'https:', 'file:'].includes(location.protocol)) {
          throw createApiServiceError(
            'snapshotLocation must be an HTTP/HTTPS URL or file:/// URI.'
          );
        }
      } catch {
        throw createApiServiceError(
          'snapshotLocation must be an HTTP/HTTPS URL or file:/// URI.'
        );
      }
      await client.recoverSnapshot(
        ctx.input.collectionName,
        {
          location: ctx.input.snapshotLocation,
          priority: ctx.input.recoveryPriority,
          checksum: ctx.input.checksum,
          apiKey: ctx.input.snapshotApiKey
        },
        wait
      );
      return {
        output: { success: true },
        message: wait
          ? `Collection \`${ctx.input.collectionName}\` recovered from snapshot.`
          : `Snapshot recovery started for collection \`${ctx.input.collectionName}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
