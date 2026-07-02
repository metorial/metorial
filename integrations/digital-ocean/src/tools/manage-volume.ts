import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let volumeSchema = z.object({
  volumeId: z.string().describe('Volume ID'),
  name: z.string().describe('Volume name'),
  region: z.string().describe('Region slug'),
  sizeGigabytes: z.number().describe('Volume size in GB'),
  description: z.string().optional().describe('Volume description'),
  filesystemType: z.string().optional().describe('Filesystem type'),
  filesystemLabel: z.string().optional().describe('Filesystem label'),
  dropletIds: z.array(z.number()).describe('IDs of attached Droplets'),
  tags: z.array(z.string()).describe('Tags'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listVolumes = SlateTool.create(spec, {
  name: 'List Volumes',
  key: 'list_volumes',
  description: `List block storage volumes in your DigitalOcean account. Optionally filter by region or name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      region: z.string().optional().describe('Filter by region slug'),
      name: z.string().optional().describe('Filter by exact volume name'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      volumes: z.array(volumeSchema),
      totalCount: z.number().describe('Total number of volumes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listVolumes({
      region: ctx.input.region,
      name: ctx.input.name,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let volumes = result.volumes.map((v: any) => ({
      volumeId: v.id,
      name: v.name,
      region: v.region?.slug || '',
      sizeGigabytes: v.size_gigabytes,
      description: v.description,
      filesystemType: v.filesystem_type,
      filesystemLabel: v.filesystem_label,
      dropletIds: v.droplet_ids || [],
      tags: v.tags || [],
      createdAt: v.created_at
    }));

    return {
      output: { volumes, totalCount: result.meta?.total || volumes.length },
      message: `Found **${volumes.length}** volume(s)${ctx.input.region ? ` in ${ctx.input.region}` : ''}.`
    };
  })
  .build();

export let createVolume = SlateTool.create(spec, {
  name: 'Create Volume',
  key: 'create_volume',
  description: `Create a new block storage volume. Volumes can be attached to Droplets for persistent storage that survives Droplet destruction.`
})
  .input(
    z.object({
      name: z.string().describe('Volume name'),
      region: z
        .string()
        .describe('Region slug (must match the Droplet region for attachment)'),
      sizeGigabytes: z.number().describe('Volume size in GB (1-16384)'),
      description: z.string().optional().describe('Volume description'),
      filesystemType: z.string().optional().describe('Filesystem type (ext4 or xfs)'),
      filesystemLabel: z.string().optional().describe('Filesystem label'),
      tags: z.array(z.string()).optional().describe('Tags to apply'),
      snapshotId: z.string().optional().describe('Create from a snapshot ID')
    })
  )
  .output(volumeSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let v = await client.createVolume({
      name: ctx.input.name,
      region: ctx.input.region,
      sizeGigabytes: ctx.input.sizeGigabytes,
      description: ctx.input.description,
      filesystemType: ctx.input.filesystemType,
      filesystemLabel: ctx.input.filesystemLabel,
      tags: ctx.input.tags,
      snapshotId: ctx.input.snapshotId
    });

    return {
      output: {
        volumeId: v.id,
        name: v.name,
        region: v.region?.slug || ctx.input.region,
        sizeGigabytes: v.size_gigabytes,
        description: v.description,
        filesystemType: v.filesystem_type,
        filesystemLabel: v.filesystem_label,
        dropletIds: v.droplet_ids || [],
        tags: v.tags || [],
        createdAt: v.created_at
      },
      message: `Created **${ctx.input.sizeGigabytes}GB** volume **${v.name}** in **${ctx.input.region}**.`
    };
  })
  .build();

export let manageVolumeAttachment = SlateTool.create(spec, {
  name: 'Manage Volume Attachment',
  key: 'manage_volume_attachment',
  description: `Attach or detach a block storage volume to/from a Droplet. The volume and Droplet must be in the same region.`
})
  .input(
    z.object({
      volumeId: z.string().describe('Volume ID'),
      action: z.enum(['attach', 'detach']).describe('Whether to attach or detach'),
      dropletId: z.number().describe('Droplet ID'),
      region: z.string().optional().describe('Region slug (helps disambiguate)')
    })
  )
  .output(
    z.object({
      actionId: z.number().describe('Action ID'),
      actionStatus: z.string().describe('Action status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result =
      ctx.input.action === 'attach'
        ? await client.attachVolume(ctx.input.volumeId, ctx.input.dropletId, ctx.input.region)
        : await client.detachVolume(ctx.input.volumeId, ctx.input.dropletId, ctx.input.region);

    return {
      output: {
        actionId: result.id,
        actionStatus: result.status
      },
      message: `${ctx.input.action === 'attach' ? 'Attached' : 'Detached'} volume **${ctx.input.volumeId}** ${ctx.input.action === 'attach' ? 'to' : 'from'} Droplet **${ctx.input.dropletId}**.`
    };
  })
  .build();

export let deleteVolume = SlateTool.create(spec, {
  name: 'Delete Volume',
  key: 'delete_volume',
  description: `Delete a block storage volume. The volume must be detached from all Droplets before deletion.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      volumeId: z.string().describe('Volume ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the volume was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteVolume(ctx.input.volumeId);

    return {
      output: { deleted: true },
      message: `Deleted volume **${ctx.input.volumeId}**.`
    };
  })
  .build();
