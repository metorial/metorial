import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let diskSchema = z.object({
  diskUuid: z.string().describe('Disk unique identifier'),
  name: z.string().optional().describe('Disk device name'),
  sizeGb: z.number().optional().describe('Disk size in GB'),
  primary: z.boolean().optional().describe('Whether this is the primary/boot disk')
});

let vmDetailSchema = z.object({
  vmUuid: z.string().describe('VM unique identifier'),
  name: z.string().describe('VM name'),
  status: z.string().describe('Current status'),
  vcpu: z.number().describe('Number of virtual CPUs'),
  ram: z.number().describe('RAM in MB'),
  osName: z.string().optional().describe('Operating system name'),
  osVersion: z.string().optional().describe('Operating system version'),
  publicIp: z.string().optional().describe('Public IPv4 address'),
  privateIp: z.string().optional().describe('Private IPv4 address'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  backup: z.boolean().optional().describe('Whether auto-backup is enabled'),
  description: z.string().optional().describe('VM description'),
  disks: z.array(diskSchema).optional().describe('Attached disks'),
  networkUuid: z.string().optional().describe('Network UUID'),
  poolUuid: z.string().optional().describe('Resource pool UUID')
});

export let getVm = SlateTool.create(spec, {
  name: 'Get Virtual Machine',
  key: 'get_vm',
  description: `Retrieve detailed information about a specific virtual machine, including its resource allocation, networking, attached disks, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vmUuid: z.string().describe('UUID of the virtual machine')
    })
  )
  .output(vmDetailSchema)
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let vm = await client.getVm(ctx.input.vmUuid);

    let disks = (vm.storage || []).map((d: any) => ({
      diskUuid: d.uuid,
      name: d.name,
      sizeGb: d.size_gb,
      primary: d.primary
    }));

    return {
      output: {
        vmUuid: vm.uuid,
        name: vm.name,
        status: vm.status,
        vcpu: vm.vcpu,
        ram: vm.ram,
        osName: vm.os_name,
        osVersion: vm.os_version,
        publicIp: vm.public_ipv4,
        privateIp: vm.private_ipv4,
        createdAt: vm.created_at,
        backup: vm.backup,
        description: vm.description,
        disks,
        networkUuid: vm.network_uuid,
        poolUuid: vm.designated_pool_uuid
      },
      message: `VM **${vm.name}** (${vm.uuid}) is **${vm.status}** with ${vm.vcpu} vCPU(s), ${vm.ram} MB RAM.`
    };
  })
  .build();
