import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageDisks = SlateTool.create(spec, {
  name: 'Manage Persistent Disks',
  key: 'manage_disks',
  description: `Manage persistent disks on Render services. Supports **list** (disks for a service), **add**, **get**, **update**, **delete**, **list_snapshots**, and **restore_snapshot** actions.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'get', 'update', 'delete', 'list_snapshots', 'restore_snapshot'])
        .describe('Action to perform'),
      serviceId: z.string().optional().describe('Service ID (for list/add)'),
      diskId: z
        .string()
        .optional()
        .describe('Disk ID (for get/update/delete/list_snapshots/restore_snapshot)'),
      snapshotKey: z
        .string()
        .optional()
        .describe('Snapshot key returned by list_snapshots (for restore_snapshot)'),
      snapshotId: z
        .string()
        .optional()
        .describe('Deprecated alias for snapshotKey (for restore_snapshot)'),
      name: z.string().optional().describe('Disk name (for add/update)'),
      mountPath: z.string().optional().describe('Mount path (for add/update)'),
      sizeGB: z.number().optional().describe('Disk size in GB (for add/update)')
    })
  )
  .output(
    z.object({
      disks: z
        .array(
          z.object({
            diskId: z.string().describe('Disk ID'),
            name: z.string().optional().describe('Disk name'),
            mountPath: z.string().optional().describe('Mount path'),
            sizeGB: z.number().optional().describe('Size in GB'),
            serviceId: z.string().optional().describe('Attached service'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of disks'),
      disk: z
        .object({
          diskId: z.string().describe('Disk ID'),
          name: z.string().optional().describe('Disk name'),
          mountPath: z.string().optional().describe('Mount path'),
          sizeGB: z.number().optional().describe('Size in GB')
        })
        .optional()
        .describe('Disk details'),
      snapshots: z
        .array(
          z.object({
            snapshotId: z.string().describe('Snapshot ID'),
            createdAt: z.string().optional().describe('Snapshot timestamp')
          })
        )
        .optional()
        .describe('Disk snapshots'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action, diskId } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.serviceId) throw createApiServiceError('serviceId is required for list');
      let data = await client.listDisks(ctx.input.serviceId);
      let disks = (data as any[]).map((item: any) => {
        let d = item.disk || item;
        return {
          diskId: d.id,
          name: d.name,
          mountPath: d.mountPath,
          sizeGB: d.sizeGB,
          serviceId: d.serviceId,
          createdAt: d.createdAt
        };
      });
      return {
        output: { disks, success: true },
        message: `Found **${disks.length}** disk(s) for service \`${ctx.input.serviceId}\`.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.serviceId) throw createApiServiceError('serviceId is required for add');
      if (!ctx.input.name) throw createApiServiceError('name is required for add');
      if (!ctx.input.mountPath) throw createApiServiceError('mountPath is required for add');
      let body: Record<string, any> = {
        serviceId: ctx.input.serviceId,
        name: ctx.input.name,
        mountPath: ctx.input.mountPath
      };
      if (ctx.input.sizeGB) body.sizeGB = ctx.input.sizeGB;
      let d = await client.addDisk(body);
      return {
        output: {
          disk: { diskId: d.id, name: d.name, mountPath: d.mountPath, sizeGB: d.sizeGB },
          success: true
        },
        message: `Added disk **${d.name}** (\`${d.id}\`) mounted at \`${d.mountPath}\`.`
      };
    }

    if (!diskId) throw createApiServiceError('diskId is required');

    if (action === 'get') {
      let d = await client.getDisk(diskId);
      return {
        output: {
          disk: { diskId: d.id, name: d.name, mountPath: d.mountPath, sizeGB: d.sizeGB },
          success: true
        },
        message: `Disk **${d.name}** — ${d.sizeGB}GB at \`${d.mountPath}\`.`
      };
    }

    if (action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.mountPath) body.mountPath = ctx.input.mountPath;
      if (ctx.input.sizeGB) body.sizeGB = ctx.input.sizeGB;
      let d = await client.updateDisk(diskId, body);
      return {
        output: {
          disk: { diskId: d.id, name: d.name, mountPath: d.mountPath, sizeGB: d.sizeGB },
          success: true
        },
        message: `Updated disk **${d.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteDisk(diskId);
      return {
        output: { success: true },
        message: `Deleted disk \`${diskId}\`.`
      };
    }

    if (action === 'list_snapshots') {
      let data = await client.listDiskSnapshots(diskId);
      let snapshots = (data as any[]).map((item: any) => {
        let s = item.snapshot || item;
        return { snapshotId: s.id, createdAt: s.createdAt };
      });
      return {
        output: { snapshots, success: true },
        message: `Found **${snapshots.length}** snapshot(s) for disk \`${diskId}\`.`
      };
    }

    if (action === 'restore_snapshot') {
      let snapshotKey = ctx.input.snapshotKey ?? ctx.input.snapshotId;
      if (!snapshotKey)
        throw createApiServiceError('snapshotKey is required for restore_snapshot');
      await client.restoreDiskSnapshot(diskId, snapshotKey);
      return {
        output: { success: true },
        message: `Restored disk \`${diskId}\` from snapshot \`${snapshotKey}\`.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
