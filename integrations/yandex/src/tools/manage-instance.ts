import { SlateTool } from 'slates';
import { z } from 'zod';
import * as compute from '../lib/compute';
import { spec } from '../spec';

let instanceSchema = z.object({
  instanceId: z.string().describe('ID of the VM instance'),
  name: z.string().optional().describe('Name of the instance'),
  description: z.string().optional().describe('Description of the instance'),
  folderId: z.string().optional().describe('Folder containing the instance'),
  zoneId: z.string().optional().describe('Availability zone'),
  platformId: z.string().optional().describe('Platform ID (e.g. standard-v3)'),
  status: z.string().optional().describe('Current status of the instance'),
  createdAt: z.string().optional().describe('Timestamp when the instance was created'),
  metadata: z.record(z.string(), z.string()).optional().describe('Instance metadata'),
  labels: z.record(z.string(), z.string()).optional().describe('Instance labels')
});

export let listInstances = SlateTool.create(spec, {
  name: 'List Instances',
  key: 'list_instances',
  description: `List virtual machine instances in a Yandex Compute Cloud folder. Returns instance details including status, zone, and platform.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().describe('Folder ID to list instances from'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of results per page (max 1000)'),
      pageToken: z.string().optional().describe('Token for pagination')
    })
  )
  .output(
    z.object({
      instances: z.array(instanceSchema).describe('List of VM instances'),
      nextPageToken: z.string().optional().describe('Token for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await compute.listInstances(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );

    return {
      output: {
        instances: result.instances || [],
        nextPageToken: result.nextPageToken
      },
      message: `Found ${(result.instances || []).length} instance(s) in folder ${folderId}.`
    };
  })
  .build();

export let getInstance = SlateTool.create(spec, {
  name: 'Get Instance',
  key: 'get_instance',
  description: `Get detailed information about a specific Yandex Compute Cloud VM instance, including its status, resources, network interfaces, and metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      instanceId: z.string().describe('ID of the VM instance to retrieve')
    })
  )
  .output(
    z.object({
      instanceId: z.string().describe('ID of the instance'),
      name: z.string().optional().describe('Name of the instance'),
      description: z.string().optional().describe('Description of the instance'),
      folderId: z.string().optional().describe('Folder ID'),
      zoneId: z.string().optional().describe('Availability zone'),
      platformId: z.string().optional().describe('Platform ID'),
      status: z.string().optional().describe('Current status'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      metadata: z.record(z.string(), z.string()).optional().describe('Instance metadata'),
      labels: z.record(z.string(), z.string()).optional().describe('Instance labels'),
      resources: z.any().optional().describe('Resource specs (memory, cores, etc.)'),
      networkInterfaces: z.any().optional().describe('Network interface configurations'),
      bootDisk: z.any().optional().describe('Boot disk information')
    })
  )
  .handleInvocation(async ctx => {
    let result = await compute.getInstance(ctx.auth, ctx.input.instanceId);

    return {
      output: {
        instanceId: result.id,
        name: result.name,
        description: result.description,
        folderId: result.folderId,
        zoneId: result.zoneId,
        platformId: result.platformId,
        status: result.status,
        createdAt: result.createdAt,
        metadata: result.metadata,
        labels: result.labels,
        resources: result.resources,
        networkInterfaces: result.networkInterfaces,
        bootDisk: result.bootDisk
      },
      message: `Instance **${result.name || result.id}** is in status **${result.status}**.`
    };
  })
  .build();

export let createInstance = SlateTool.create(spec, {
  name: 'Create Instance',
  key: 'create_instance',
  description: `Create a new virtual machine instance in Yandex Compute Cloud. Configure the VM with specified resources, boot disk, network, and metadata.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      folderId: z.string().describe('Folder ID to create the instance in'),
      name: z.string().describe('Name for the new instance'),
      description: z.string().optional().describe('Description for the instance'),
      zoneId: z.string().describe('Availability zone (e.g. ru-central1-a)'),
      platformId: z.string().default('standard-v3').describe('Platform ID (e.g. standard-v3)'),
      memory: z.number().describe('RAM in bytes (e.g. 2147483648 for 2GB)'),
      cores: z.number().describe('Number of CPU cores'),
      coreFraction: z.number().optional().describe('CPU core fraction (5, 20, 50, 100)'),
      bootDiskSize: z.number().describe('Boot disk size in bytes'),
      bootDiskImageId: z.string().optional().describe('Image ID for the boot disk'),
      bootDiskSnapshotId: z.string().optional().describe('Snapshot ID for the boot disk'),
      bootDiskTypeId: z
        .string()
        .optional()
        .describe('Disk type (e.g. network-hdd, network-ssd)'),
      subnetId: z.string().describe('Subnet ID for the primary network interface'),
      assignPublicIp: z
        .boolean()
        .optional()
        .describe('Whether to assign a public IPv4 address'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Instance metadata (e.g. ssh-keys, user-data)'),
      labels: z.record(z.string(), z.string()).optional().describe('Instance labels')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('ID of the create operation'),
      instanceId: z.string().optional().describe('ID of the created instance'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let primaryV4AddressSpec = ctx.input.assignPublicIp
      ? {
          oneToOneNatSpec: { ipVersion: 'IPV4' }
        }
      : undefined;

    let result = await compute.createInstance(ctx.auth, {
      folderId,
      name: ctx.input.name,
      description: ctx.input.description,
      zoneId: ctx.input.zoneId,
      platformId: ctx.input.platformId,
      resourcesSpec: {
        memory: ctx.input.memory,
        cores: ctx.input.cores,
        coreFraction: ctx.input.coreFraction
      },
      bootDiskSpec: {
        diskSpec: {
          size: ctx.input.bootDiskSize,
          imageId: ctx.input.bootDiskImageId,
          snapshotId: ctx.input.bootDiskSnapshotId,
          typeId: ctx.input.bootDiskTypeId
        },
        autoDelete: true
      },
      networkInterfaceSpecs: [
        {
          subnetId: ctx.input.subnetId,
          primaryV4AddressSpec
        }
      ],
      metadata: ctx.input.metadata,
      labels: ctx.input.labels
    });

    return {
      output: {
        operationId: result.id,
        instanceId: result.metadata?.instanceId,
        done: result.done || false
      },
      message: `Instance creation initiated. Operation ID: **${result.id}**.`
    };
  })
  .build();

export let controlInstance = SlateTool.create(spec, {
  name: 'Control Instance',
  key: 'control_instance',
  description: `Start, stop, restart, or delete a Yandex Compute Cloud VM instance. Use this to manage the lifecycle and power state of your virtual machines.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      instanceId: z.string().describe('ID of the VM instance'),
      action: z
        .enum(['start', 'stop', 'restart', 'delete'])
        .describe('Action to perform on the instance')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('ID of the operation'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let result: any;
    switch (ctx.input.action) {
      case 'start':
        result = await compute.startInstance(ctx.auth, ctx.input.instanceId);
        break;
      case 'stop':
        result = await compute.stopInstance(ctx.auth, ctx.input.instanceId);
        break;
      case 'restart':
        result = await compute.restartInstance(ctx.auth, ctx.input.instanceId);
        break;
      case 'delete':
        result = await compute.deleteInstance(ctx.auth, ctx.input.instanceId);
        break;
    }

    return {
      output: {
        operationId: result.id,
        done: result.done || false
      },
      message: `Instance **${ctx.input.instanceId}** ${ctx.input.action} operation initiated. Operation ID: **${result.id}**.`
    };
  })
  .build();

export let updateInstance = SlateTool.create(spec, {
  name: 'Update Instance',
  key: 'update_instance',
  description: `Update the name, description, labels, or metadata of a Yandex Compute Cloud VM instance.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      instanceId: z.string().describe('ID of the VM instance to update'),
      name: z.string().optional().describe('New name for the instance'),
      description: z.string().optional().describe('New description'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('New labels (replaces existing)'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('New metadata (replaces existing)')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('ID of the update operation'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let updateFields: string[] = [];
    if (ctx.input.name !== undefined) updateFields.push('name');
    if (ctx.input.description !== undefined) updateFields.push('description');
    if (ctx.input.labels !== undefined) updateFields.push('labels');
    if (ctx.input.metadata !== undefined) updateFields.push('metadata');

    let result = await compute.updateInstance(ctx.auth, ctx.input.instanceId, {
      name: ctx.input.name,
      description: ctx.input.description,
      labels: ctx.input.labels,
      metadata: ctx.input.metadata,
      updateMask: updateFields.join(',')
    });

    return {
      output: {
        operationId: result.id,
        done: result.done || false
      },
      message: `Instance **${ctx.input.instanceId}** update initiated. Updated fields: ${updateFields.join(', ')}.`
    };
  })
  .build();
