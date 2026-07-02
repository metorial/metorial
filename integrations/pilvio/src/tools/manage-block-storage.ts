import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let diskSchema = z.object({
  diskUuid: z.string().describe('Disk UUID'),
  displayName: z.string().optional().describe('Display name'),
  sizeGb: z.number().optional().describe('Disk size in GB'),
  status: z.string().optional().describe('Disk status'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  attachedTo: z.string().optional().describe('VM UUID the disk is attached to')
});

export let manageBlockStorage = SlateTool.create(spec, {
  name: 'Manage Block Storage',
  key: 'manage_block_storage',
  description: `Create, list, get, modify, attach, detach, or delete standalone block storage disks. Disks can be initialized as empty, from an OS image, from an existing disk, or from a snapshot.`,
  instructions: [
    'Use "list" to view all standalone disks.',
    'Use "get" to retrieve details for a specific disk.',
    'Use "create" to create a new standalone disk.',
    'Use "modify" to update disk display name or billing account.',
    'Use "attach" or "detach" to connect/disconnect a disk from a VM.',
    'Use "delete" to permanently remove a disk and all its snapshots.'
  ],
  constraints: [
    'Disk size can only be increased, not decreased.',
    'Deleting a disk also deletes all its snapshots.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'modify', 'attach', 'detach', 'delete'])
        .describe('Operation to perform'),
      diskUuid: z
        .string()
        .optional()
        .describe('Disk UUID (required for get, modify, attach, detach, delete)'),
      vmUuid: z.string().optional().describe('VM UUID (required for attach/detach)'),
      sizeGb: z.number().optional().describe('Disk size in GB (for create)'),
      displayName: z.string().optional().describe('Disk display name (for create/modify)'),
      billingAccountId: z.number().optional().describe('Billing account ID'),
      sourceImageType: z
        .enum(['OS_BASE', 'DISK', 'SNAPSHOT', 'EMPTY'])
        .optional()
        .describe('Source type for disk creation'),
      sourceImage: z
        .string()
        .optional()
        .describe('Source image identifier (for create from OS/disk/snapshot)')
    })
  )
  .output(
    z.object({
      disk: diskSchema.optional().describe('Disk details (for get/create/modify)'),
      disks: z.array(diskSchema).optional().describe('List of disks (for list)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapDisk = (d: any) => ({
      diskUuid: d.uuid,
      displayName: d.display_name || d.name,
      sizeGb: d.size_gb,
      status: d.status,
      createdAt: d.created_at,
      attachedTo: d.vm_uuid
    });

    switch (action) {
      case 'list': {
        let disks = await client.listDisks();
        let mapped = (Array.isArray(disks) ? disks : []).map(mapDisk);
        return {
          output: { disks: mapped, success: true },
          message: `Found **${mapped.length}** block storage disk(s).`
        };
      }

      case 'get': {
        if (!ctx.input.diskUuid) throw new Error('diskUuid is required for get action');
        let disk = await client.getDisk(ctx.input.diskUuid);
        return {
          output: { disk: mapDisk(disk), success: true },
          message: `Retrieved disk **${disk.display_name || disk.uuid}** (${disk.size_gb} GB).`
        };
      }

      case 'create': {
        let disk = await client.createDisk({
          sizeGb: ctx.input.sizeGb,
          billingAccountId: ctx.input.billingAccountId,
          displayName: ctx.input.displayName,
          sourceImageType: ctx.input.sourceImageType,
          sourceImage: ctx.input.sourceImage
        });
        return {
          output: { disk: mapDisk(disk), success: true },
          message: `Created block storage disk **${disk.display_name || disk.uuid}**.`
        };
      }

      case 'modify': {
        if (!ctx.input.diskUuid) throw new Error('diskUuid is required for modify action');
        let disk = await client.modifyDisk(ctx.input.diskUuid, {
          displayName: ctx.input.displayName,
          billingAccountId: ctx.input.billingAccountId
        });
        return {
          output: { disk: mapDisk(disk), success: true },
          message: `Modified disk **${ctx.input.diskUuid}**.`
        };
      }

      case 'attach': {
        if (!ctx.input.diskUuid || !ctx.input.vmUuid)
          throw new Error('diskUuid and vmUuid are required for attach action');
        await client.attachDisk(ctx.input.vmUuid, ctx.input.diskUuid);
        return {
          output: { success: true },
          message: `Attached disk **${ctx.input.diskUuid}** to VM **${ctx.input.vmUuid}**.`
        };
      }

      case 'detach': {
        if (!ctx.input.diskUuid || !ctx.input.vmUuid)
          throw new Error('diskUuid and vmUuid are required for detach action');
        await client.detachDisk(ctx.input.vmUuid, ctx.input.diskUuid);
        return {
          output: { success: true },
          message: `Detached disk **${ctx.input.diskUuid}** from VM **${ctx.input.vmUuid}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.diskUuid) throw new Error('diskUuid is required for delete action');
        await client.deleteDisk(ctx.input.diskUuid);
        return {
          output: { success: true },
          message: `Deleted disk **${ctx.input.diskUuid}** and all its snapshots.`
        };
      }
    }
  })
  .build();
