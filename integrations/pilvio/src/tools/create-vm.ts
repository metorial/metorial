import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

export let createVm = SlateTool.create(spec, {
  name: 'Create Virtual Machine',
  key: 'create_vm',
  description: `Create a new virtual machine with a chosen OS image, CPU, RAM, and disk configuration. Supports SSH key injection, cloud-init, custom networks, and creating from snapshots/backups.`,
  instructions: [
    'For a custom empty disk (manual OS install), set osName to "_custom" and osVersion to "_", or omit them entirely.',
    'To create a VM from an existing snapshot, provide sourceVmUuid and sourceReplicaUuid.',
    'To use an existing unattached disk as boot disk, provide bootDiskUuid.'
  ],
  constraints: ['Disk size is specified as a string (e.g., "20" for 20 GB).']
})
  .input(
    z.object({
      name: z.string().describe('Name for the virtual machine'),
      osName: z
        .string()
        .optional()
        .describe('Operating system name (e.g., "Ubuntu"). Omit for custom/empty disk.'),
      osVersion: z
        .string()
        .optional()
        .describe('Operating system version (e.g., "22.04"). Omit for custom/empty disk.'),
      diskSizeGb: z.string().describe('Boot disk size in GB (e.g., "20")'),
      vcpu: z.number().describe('Number of virtual CPUs'),
      ram: z.number().describe('RAM in MB (e.g., 1024, 2048)'),
      username: z.string().describe('Login username for the VM'),
      password: z.string().describe('Login password for the VM'),
      billingAccountId: z
        .number()
        .optional()
        .describe('Billing account ID (optional if using restricted token)'),
      networkUuid: z.string().optional().describe('Private network UUID to place the VM in'),
      designatedPoolUuid: z.string().optional().describe('Resource pool UUID (server class)'),
      sourceVmUuid: z
        .string()
        .optional()
        .describe('Source VM UUID when creating from a snapshot/backup'),
      sourceReplicaUuid: z
        .string()
        .optional()
        .describe('Source replica (snapshot/backup) UUID'),
      bootDiskUuid: z
        .string()
        .optional()
        .describe('Existing unattached disk UUID to use as boot disk'),
      reservePublicIp: z
        .boolean()
        .optional()
        .describe('Whether to reserve a public IPv4 (default: true)'),
      publicKeys: z.array(z.string()).optional().describe('SSH public keys to inject'),
      cloudInit: z.string().optional().describe('Cloud-init user data as JSON string'),
      enableBackup: z.boolean().optional().describe('Enable automatic weekly backups'),
      description: z.string().optional().describe('Description for the VM')
    })
  )
  .output(
    z.object({
      vmUuid: z.string().describe('UUID of the created VM'),
      name: z.string().describe('VM name'),
      status: z.string().describe('Initial VM status'),
      publicIp: z.string().optional().describe('Assigned public IPv4 address'),
      privateIp: z.string().optional().describe('Assigned private IPv4 address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let vm = await client.createVm({
      name: ctx.input.name,
      osName: ctx.input.osName,
      osVersion: ctx.input.osVersion,
      disks: ctx.input.diskSizeGb,
      vcpu: ctx.input.vcpu,
      ram: ctx.input.ram,
      username: ctx.input.username,
      password: ctx.input.password,
      billingAccountId: ctx.input.billingAccountId,
      networkUuid: ctx.input.networkUuid,
      designatedPoolUuid: ctx.input.designatedPoolUuid,
      sourceUuid: ctx.input.sourceVmUuid,
      sourceReplica: ctx.input.sourceReplicaUuid,
      diskUuid: ctx.input.bootDiskUuid,
      reservePublicIp: ctx.input.reservePublicIp,
      publicKeys: ctx.input.publicKeys,
      cloudInit: ctx.input.cloudInit,
      backup: ctx.input.enableBackup,
      description: ctx.input.description
    });

    return {
      output: {
        vmUuid: vm.uuid,
        name: vm.name,
        status: vm.status,
        publicIp: vm.public_ipv4,
        privateIp: vm.private_ipv4
      },
      message: `Created VM **${vm.name}** (${vm.uuid}) with ${ctx.input.vcpu} vCPU(s) and ${ctx.input.ram} MB RAM.`
    };
  })
  .build();
