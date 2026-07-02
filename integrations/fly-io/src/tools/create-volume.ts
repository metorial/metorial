import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createVolume = SlateTool.create(spec, {
  name: 'Create Volume',
  key: 'create_volume',
  description: `Create a new persistent storage volume for a Fly App. Volumes provide local persistent storage that can be attached to one Machine at a time. Optionally restore from a snapshot.`,
  constraints: [
    'Default volume size is 3 GB.',
    'Volumes are tied to a specific region and hardware zone.',
    'Each volume can only be attached to one Machine at a time.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      volumeName: z.string().describe('Name for the new volume'),
      region: z.string().optional().describe('Region code (defaults to app primary region)'),
      sizeGb: z.number().optional().describe('Volume size in GB (default: 3)'),
      encrypted: z.boolean().optional().describe('Enable encryption (default: true)'),
      snapshotRetention: z
        .number()
        .optional()
        .describe('Snapshot retention in days (1-60, default: 5)'),
      autoBackupEnabled: z
        .boolean()
        .optional()
        .describe('Enable daily automatic snapshots (default: true)'),
      snapshotId: z.string().optional().describe('Snapshot ID to restore from')
    })
  )
  .output(
    z.object({
      volumeId: z.string().describe('Unique volume identifier'),
      volumeName: z.string().describe('Volume name'),
      state: z.string().describe('Volume state'),
      sizeGb: z.number().describe('Volume size in GB'),
      region: z.string().describe('Region code'),
      zone: z.string().describe('Hardware zone'),
      encrypted: z.boolean().describe('Whether the volume is encrypted'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let volume = await client.createVolume(ctx.input.appName, {
      name: ctx.input.volumeName,
      region: ctx.input.region,
      sizeGb: ctx.input.sizeGb,
      encrypted: ctx.input.encrypted,
      snapshotRetention: ctx.input.snapshotRetention,
      autoBackupEnabled: ctx.input.autoBackupEnabled,
      snapshotId: ctx.input.snapshotId
    });

    return {
      output: volume,
      message: `Created volume **${volume.volumeName}** (${volume.sizeGb} GB) in region **${volume.region}**.`
    };
  })
  .build();
