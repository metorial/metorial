import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listVolumes = SlateTool.create(spec, {
  name: 'List Volumes',
  key: 'list_volumes',
  description: `List all persistent storage volumes for a Fly App. Returns volume IDs, sizes, states, regions, and attachment information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App')
    })
  )
  .output(
    z.object({
      volumes: z
        .array(
          z.object({
            volumeId: z.string().describe('Unique volume identifier'),
            volumeName: z.string().describe('Volume name'),
            state: z.string().describe('Volume state (created, destroyed, restoring)'),
            sizeGb: z.number().describe('Storage size in GB'),
            region: z.string().describe('Region code'),
            zone: z.string().describe('Hardware zone'),
            encrypted: z.boolean().describe('Whether the volume is encrypted'),
            snapshotRetention: z.number().describe('Snapshot retention in days'),
            autoBackupEnabled: z.boolean().describe('Whether auto-backup is enabled'),
            attachedMachineId: z
              .string()
              .nullable()
              .describe('ID of the machine this volume is attached to'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of volumes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let volumes = await client.listVolumes(ctx.input.appName);

    return {
      output: { volumes },
      message: `Found **${volumes.length}** volume(s) in app **${ctx.input.appName}**.`
    };
  })
  .build();
