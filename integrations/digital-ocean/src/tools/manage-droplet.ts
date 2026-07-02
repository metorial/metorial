import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

export let createDroplet = SlateTool.create(spec, {
  name: 'Create Droplet',
  key: 'create_droplet',
  description: `Create a new Droplet (virtual machine) in DigitalOcean. Configure the region, size, image, SSH keys, backups, monitoring, and networking options. Use the **List Regions** and **List Sizes** tools to find valid region slugs and size slugs.`,
  instructions: [
    'Common images: "ubuntu-24-04-x64", "debian-12-x64", "centos-stream-9-x64", "fedora-40-x64"',
    'Common sizes: "s-1vcpu-1gb", "s-2vcpu-2gb", "s-4vcpu-8gb"',
    'Common regions: "nyc1", "sfo3", "ams3", "sgp1", "lon1", "fra1"'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the new Droplet'),
      region: z.string().describe('Region slug (e.g., "nyc1", "sfo3", "ams3")'),
      size: z.string().describe('Size slug (e.g., "s-1vcpu-1gb", "s-2vcpu-2gb")'),
      image: z
        .union([z.string(), z.number()])
        .describe('Image slug (e.g., "ubuntu-24-04-x64") or image ID'),
      sshKeyIds: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe('SSH key IDs or fingerprints to add'),
      backups: z.boolean().optional().describe('Enable automated backups'),
      ipv6: z.boolean().optional().describe('Enable IPv6 networking'),
      monitoring: z.boolean().optional().describe('Enable monitoring agent'),
      userData: z.string().optional().describe('Cloud-init user data script'),
      vpcUuid: z.string().optional().describe('UUID of the VPC to place the Droplet in'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the Droplet')
    })
  )
  .output(
    z.object({
      dropletId: z.number().describe('ID of the created Droplet'),
      name: z.string().describe('Name of the created Droplet'),
      status: z.string().describe('Current status of the Droplet'),
      region: z.string().describe('Region slug'),
      size: z.string().describe('Size slug'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let droplet = await client.createDroplet({
      name: ctx.input.name,
      region: ctx.input.region,
      size: ctx.input.size,
      image: ctx.input.image,
      sshKeys: ctx.input.sshKeyIds,
      backups: ctx.input.backups,
      ipv6: ctx.input.ipv6,
      monitoring: ctx.input.monitoring,
      userData: ctx.input.userData,
      vpcUuid: ctx.input.vpcUuid,
      tags: ctx.input.tags
    });

    return {
      output: {
        dropletId: droplet.id,
        name: droplet.name,
        status: droplet.status,
        region: droplet.region?.slug || ctx.input.region,
        size: droplet.size_slug || ctx.input.size,
        createdAt: droplet.created_at
      },
      message: `Created Droplet **${droplet.name}** (ID: ${droplet.id}) in **${ctx.input.region}** with size **${ctx.input.size}**.`
    };
  })
  .build();

export let deleteDroplet = SlateTool.create(spec, {
  name: 'Delete Droplet',
  key: 'delete_droplet',
  description: `Permanently delete a Droplet (virtual machine). This is irreversible and will destroy all data on the Droplet that is not backed up or stored on attached volumes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dropletId: z.number().describe('ID of the Droplet to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the Droplet was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDroplet(ctx.input.dropletId);

    return {
      output: { deleted: true },
      message: `Deleted Droplet **${ctx.input.dropletId}**.`
    };
  })
  .build();

export let performDropletAction = SlateTool.create(spec, {
  name: 'Droplet Action',
  key: 'droplet_action',
  description: `Perform an action on a Droplet: **power_on**, **power_off**, **reboot**, **shutdown** (graceful), **resize**, **rebuild**, **rename**, or **snapshot**. Combine common Droplet management operations in a single tool.`,
  instructions: [
    'Use "shutdown" for graceful shutdown and "power_off" for hard power off',
    'Resize requires the Droplet to be powered off first',
    'Snapshot creates a backup image of the Droplet'
  ]
})
  .input(
    z.object({
      dropletId: z.number().describe('ID of the Droplet'),
      action: z
        .enum([
          'power_on',
          'power_off',
          'reboot',
          'shutdown',
          'resize',
          'rebuild',
          'rename',
          'snapshot'
        ])
        .describe('Action to perform'),
      size: z.string().optional().describe('New size slug (required for resize action)'),
      image: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Image slug or ID (required for rebuild action)'),
      name: z.string().optional().describe('New name (required for rename action)'),
      snapshotName: z
        .string()
        .optional()
        .describe('Name for the snapshot (required for snapshot action)'),
      resizeDisk: z
        .boolean()
        .optional()
        .describe('Whether to also resize the disk when resizing (default: true)')
    })
  )
  .output(
    z.object({
      actionId: z.number().describe('ID of the action performed'),
      actionType: z.string().describe('Type of action performed'),
      actionStatus: z
        .string()
        .describe('Status of the action (in-progress, completed, errored)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    switch (ctx.input.action) {
      case 'resize':
        if (!ctx.input.size) {
          throw digitalOceanValidationError('Size is required for resize action');
        }
        result = await client.resizeDroplet(
          ctx.input.dropletId,
          ctx.input.size,
          ctx.input.resizeDisk ?? true
        );
        break;
      case 'rebuild':
        if (!ctx.input.image) {
          throw digitalOceanValidationError('Image is required for rebuild action');
        }
        result = await client.rebuildDroplet(ctx.input.dropletId, ctx.input.image);
        break;
      case 'rename':
        if (!ctx.input.name) {
          throw digitalOceanValidationError('Name is required for rename action');
        }
        result = await client.renameDroplet(ctx.input.dropletId, ctx.input.name);
        break;
      case 'snapshot':
        if (!ctx.input.snapshotName)
          throw digitalOceanValidationError('Snapshot name is required for snapshot action');
        result = await client.createDropletSnapshot(
          ctx.input.dropletId,
          ctx.input.snapshotName
        );
        break;
      default:
        result = await client.performDropletAction(ctx.input.dropletId, {
          type: ctx.input.action
        });
        break;
    }

    return {
      output: {
        actionId: result.id,
        actionType: result.type,
        actionStatus: result.status
      },
      message: `Performed **${ctx.input.action}** on Droplet **${ctx.input.dropletId}**. Status: ${result.status}.`
    };
  })
  .build();
