import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let vmSchema = z.object({
  raw: z.unknown().optional().describe('Complete provider response for this resource'),
  vmUuid: z.string().describe('VM unique identifier'),
  name: z.string().describe('VM name'),
  status: z.string().describe('Current status (e.g., running, stopped)'),
  vcpu: z.number().describe('Number of virtual CPUs'),
  ram: z.number().describe('RAM in MB'),
  osName: z.string().optional().describe('Operating system name'),
  osVersion: z.string().optional().describe('Operating system version'),
  publicIp: z.string().optional().describe('Public IPv4 address'),
  privateIp: z.string().optional().describe('Private IPv4 address'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  backup: z.boolean().optional().describe('Whether auto-backup is enabled'),
  description: z.string().optional().describe('VM description')
});

export let listVms = SlateTool.create(spec, {
  name: 'List Virtual Machines',
  key: 'list_vms',
  description: `List virtual machines in the configured datacenter location (or the default location). Query each location separately for a complete account inventory. Returns each VM's status, resource allocation (vCPU, RAM), networking details, and OS information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      vms: z.array(vmSchema).describe('List of virtual machines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let vms = await client.listVms();

    let mapped = vms.map((vm: any) => ({
      raw: vm,
      vmUuid: vm.uuid,
      name: vm.name,
      status: vm.status,
      vcpu: vm.vcpu,
      ram: vm.memory ?? vm.ram,
      osName: vm.os_name ?? undefined,
      osVersion: vm.os_version ?? undefined,
      publicIp: vm.public_ipv4 ?? undefined,
      privateIp: vm.private_ipv4 ?? undefined,
      createdAt: vm.created_at ?? undefined,
      backup: vm.backup ?? undefined,
      description: vm.description
    }));

    return {
      output: { vms: mapped },
      message: `Found **${mapped.length}** virtual machine(s).`
    };
  })
  .build();
