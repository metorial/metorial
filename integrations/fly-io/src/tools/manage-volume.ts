import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageVolume = SlateTool.create(spec, {
  name: 'Manage Volume',
  key: 'manage_volume',
  description: `Get details, update settings, extend size, or delete a Fly Volume. Also supports listing and creating snapshots for a volume.`,
  instructions: [
    'Use "get" to retrieve volume details.',
    'Use "update" to modify snapshot retention or auto-backup settings.',
    'Use "extend" to increase the volume size (cannot be decreased).',
    'Use "delete" to permanently destroy the volume.',
    'Use "list_snapshots" to see available snapshots.',
    'Use "create_snapshot" to trigger an on-demand snapshot.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      volumeId: z.string().describe('ID of the volume'),
      action: z
        .enum(['get', 'update', 'extend', 'delete', 'list_snapshots', 'create_snapshot'])
        .describe('Action to perform'),
      snapshotRetention: z
        .number()
        .optional()
        .describe('Snapshot retention in days (for update, 1-60)'),
      autoBackupEnabled: z
        .boolean()
        .optional()
        .describe('Enable/disable auto-backup (for update)'),
      sizeGb: z
        .number()
        .optional()
        .describe('New size in GB (for extend; must be larger than current size)')
    })
  )
  .output(
    z.object({
      volume: z
        .object({
          volumeId: z.string().describe('Volume identifier'),
          volumeName: z.string().describe('Volume name'),
          state: z.string().describe('Volume state'),
          sizeGb: z.number().describe('Volume size in GB'),
          region: z.string().describe('Region code'),
          encrypted: z.boolean().describe('Encryption status'),
          attachedMachineId: z.string().nullable().describe('Attached machine ID')
        })
        .optional()
        .describe('Volume details (for get, update, extend)'),
      deleted: z.boolean().optional().describe('Whether the volume was deleted'),
      snapshots: z
        .array(
          z.object({
            snapshotId: z.string().describe('Snapshot ID'),
            sizeGb: z.number().describe('Snapshot size in GB'),
            createdAt: z.string().describe('Creation timestamp'),
            status: z.string().describe('Snapshot status')
          })
        )
        .optional()
        .describe('Snapshots list (for list_snapshots)'),
      snapshotCreated: z.boolean().optional().describe('Whether snapshot was created'),
      needsRestart: z
        .boolean()
        .optional()
        .describe('Whether the machine needs restart after extend')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { appName, volumeId, action } = ctx.input;

    switch (action) {
      case 'get': {
        let volume = await client.getVolume(appName, volumeId);
        return {
          output: {
            volume: {
              volumeId: volume.volumeId,
              volumeName: volume.volumeName,
              state: volume.state,
              sizeGb: volume.sizeGb,
              region: volume.region,
              encrypted: volume.encrypted,
              attachedMachineId: volume.attachedMachineId
            }
          },
          message: `Volume **${volume.volumeName}** is **${volume.sizeGb} GB** in **${volume.state}** state.`
        };
      }
      case 'update': {
        let volume = await client.updateVolume(appName, volumeId, {
          snapshotRetention: ctx.input.snapshotRetention,
          autoBackupEnabled: ctx.input.autoBackupEnabled
        });
        return {
          output: {
            volume: {
              volumeId: volume.volumeId,
              volumeName: volume.volumeName,
              state: volume.state,
              sizeGb: volume.sizeGb,
              region: volume.region,
              encrypted: volume.encrypted,
              attachedMachineId: volume.attachedMachineId
            }
          },
          message: `Updated volume **${volume.volumeName}** settings.`
        };
      }
      case 'extend': {
        if (!ctx.input.sizeGb) throw new Error('sizeGb is required for extend action');
        let result = await client.extendVolume(appName, volumeId, ctx.input.sizeGb);
        return {
          output: {
            volume: {
              volumeId: result.volume.volumeId,
              volumeName: result.volume.volumeName,
              state: result.volume.state,
              sizeGb: result.volume.sizeGb,
              region: result.volume.region,
              encrypted: result.volume.encrypted,
              attachedMachineId: result.volume.attachedMachineId
            },
            needsRestart: result.needsRestart
          },
          message: `Extended volume to **${ctx.input.sizeGb} GB**.${result.needsRestart ? ' Machine restart required.' : ''}`
        };
      }
      case 'delete': {
        await client.deleteVolume(appName, volumeId);
        return {
          output: { deleted: true },
          message: `Deleted volume **${volumeId}**.`
        };
      }
      case 'list_snapshots': {
        let snapshots = await client.listVolumeSnapshots(appName, volumeId);
        return {
          output: { snapshots },
          message: `Found **${snapshots.length}** snapshot(s) for volume **${volumeId}**.`
        };
      }
      case 'create_snapshot': {
        await client.createVolumeSnapshot(appName, volumeId);
        return {
          output: { snapshotCreated: true },
          message: `Initiated snapshot for volume **${volumeId}**.`
        };
      }
    }
  })
  .build();
