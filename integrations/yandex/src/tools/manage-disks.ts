import { SlateTool } from 'slates';
import { z } from 'zod';
import * as compute from '../lib/compute';
import { spec } from '../spec';

export let listDisks = SlateTool.create(spec, {
  name: 'List Disks',
  key: 'list_disks',
  description: `List disks in a Yandex Compute Cloud folder. Returns disk details including size, type, status, and attached instances.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list disks from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      disks: z
        .array(
          z.object({
            diskId: z.string().describe('Disk ID'),
            name: z.string().optional().describe('Disk name'),
            description: z.string().optional().describe('Disk description'),
            folderId: z.string().optional().describe('Folder ID'),
            zoneId: z.string().optional().describe('Availability zone'),
            typeId: z.string().optional().describe('Disk type'),
            size: z.number().optional().describe('Disk size in bytes'),
            status: z.string().optional().describe('Disk status'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Labels'),
            instanceIds: z
              .array(z.string())
              .optional()
              .describe('IDs of instances using this disk')
          })
        )
        .describe('List of disks'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await compute.listDisks(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let disks = (result.disks || []).map((d: any) => ({
      diskId: d.id,
      name: d.name,
      description: d.description,
      folderId: d.folderId,
      zoneId: d.zoneId,
      typeId: d.typeId,
      size: d.size ? Number(d.size) : undefined,
      status: d.status,
      createdAt: d.createdAt,
      labels: d.labels,
      instanceIds: d.instanceIds
    }));

    return {
      output: {
        disks,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${disks.length} disk(s) in folder ${folderId}.`
    };
  })
  .build();

export let manageDisk = SlateTool.create(spec, {
  name: 'Manage Disk',
  key: 'manage_disk',
  description: `Create or delete a disk in Yandex Compute Cloud. Disks can be created from images, snapshots, or as empty volumes.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      diskId: z.string().optional().describe('Disk ID (required for delete)'),
      folderId: z.string().optional().describe('Folder ID (required for create)'),
      name: z.string().optional().describe('Disk name'),
      description: z.string().optional().describe('Disk description'),
      size: z.number().optional().describe('Disk size in bytes (required for create)'),
      zoneId: z.string().optional().describe('Availability zone (required for create)'),
      typeId: z
        .string()
        .optional()
        .describe('Disk type (network-hdd, network-ssd, network-ssd-nonreplicated)'),
      imageId: z.string().optional().describe('Source image ID'),
      snapshotId: z.string().optional().describe('Source snapshot ID'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      diskId: z.string().optional().describe('Disk ID'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      let folderId = ctx.input.folderId || ctx.config.folderId;
      if (!folderId) throw new Error('folderId is required for disk creation');
      if (!ctx.input.size) throw new Error('size is required for disk creation');
      if (!ctx.input.zoneId) throw new Error('zoneId is required for disk creation');

      let result = await compute.createDisk(ctx.auth, {
        folderId,
        name: ctx.input.name,
        description: ctx.input.description,
        size: ctx.input.size,
        zoneId: ctx.input.zoneId,
        typeId: ctx.input.typeId,
        imageId: ctx.input.imageId,
        snapshotId: ctx.input.snapshotId,
        labels: ctx.input.labels
      });

      return {
        output: {
          operationId: result.id,
          diskId: result.metadata?.diskId,
          done: result.done || false
        },
        message: `Disk creation initiated. Operation ID: **${result.id}**.`
      };
    } else {
      if (!ctx.input.diskId) throw new Error('diskId is required for deletion');

      let result = await compute.deleteDisk(ctx.auth, ctx.input.diskId);

      return {
        output: {
          operationId: result.id,
          done: result.done || false
        },
        message: `Disk **${ctx.input.diskId}** deletion initiated.`
      };
    }
  })
  .build();
