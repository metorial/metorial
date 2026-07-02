import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSnapshot = SlateTool.create(spec, {
  name: 'Create Blob Snapshot',
  key: 'create_snapshot',
  description: `Create a read-only snapshot of a blob at its current state. Snapshots capture a point-in-time copy that can be used for backup or versioning. Optionally set metadata on the snapshot.`
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Full name/path of the blob to snapshot'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata to set on the snapshot')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container the blob belongs to'),
      blobName: z.string().describe('Name of the blob'),
      snapshotId: z.string().describe('Snapshot datetime identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let result = await client.createSnapshot(
      ctx.input.containerName,
      ctx.input.blobName,
      ctx.input.metadata
    );

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        snapshotId: result.snapshotId
      },
      message: `Snapshot created for blob **${ctx.input.blobName}** (snapshot ID: ${result.snapshotId}).`
    };
  })
  .build();
