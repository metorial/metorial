import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

let podSchema = z.object({
  podId: z.string().describe('Unique identifier for the Pod'),
  name: z.string().nullable().describe('User-defined name of the Pod'),
  desiredStatus: z
    .string()
    .nullable()
    .describe('Current desired status: RUNNING, EXITED, or TERMINATED'),
  imageName: z.string().nullable().describe('Container image used by the Pod'),
  costPerHr: z.number().nullable().describe('Cost per hour in USD'),
  vcpuCount: z.number().nullable().describe('Number of vCPUs allocated'),
  memoryInGb: z.number().nullable().describe('Memory allocated in GB'),
  containerDiskInGb: z.number().nullable().describe('Container disk size in GB'),
  volumeInGb: z.number().nullable().describe('Persistent volume size in GB'),
  gpuCount: z.number().nullable().describe('Number of GPUs allocated'),
  gpuType: z.string().nullable().describe('Type of GPU allocated')
});

export let listPods = SlateTool.create(spec, {
  name: 'List Pods',
  key: 'list_pods',
  description: `List all GPU/CPU Pods in your RunPod account. Filter by compute type, status, GPU type, name, or attached network volume to find specific Pods. Returns Pod details including configuration, pricing, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      computeType: z.enum(['GPU', 'CPU']).optional().describe('Filter by compute type'),
      desiredStatus: z
        .enum(['RUNNING', 'EXITED', 'TERMINATED'])
        .optional()
        .describe('Filter by Pod status'),
      name: z.string().optional().describe('Filter by Pod name'),
      networkVolumeId: z.string().optional().describe('Filter by attached network volume ID')
    })
  )
  .output(
    z.object({
      pods: z.array(podSchema).describe('List of Pods matching the filter criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let result = await client.listPods({
      computeType: ctx.input.computeType,
      desiredStatus: ctx.input.desiredStatus,
      name: ctx.input.name,
      networkVolumeId: ctx.input.networkVolumeId,
      includeMachine: true,
      includeNetworkVolume: true
    });

    let pods = Array.isArray(result) ? result : [];

    let mapped = pods.map((p: any) => ({
      podId: p.id,
      name: p.name ?? null,
      desiredStatus: p.desiredStatus ?? null,
      imageName: p.imageName ?? p.image ?? null,
      costPerHr: p.costPerHr ?? null,
      vcpuCount: p.vcpuCount ?? null,
      memoryInGb: p.memoryInGb ?? null,
      containerDiskInGb: p.containerDiskInGb ?? null,
      volumeInGb: p.volumeInGb ?? null,
      gpuCount: p.gpu?.count ?? p.gpuCount ?? null,
      gpuType: p.gpu?.gpuTypeId ?? p.gpuTypeId ?? null
    }));

    return {
      output: { pods: mapped },
      message: `Found **${mapped.length}** Pod(s)${ctx.input.desiredStatus ? ` with status ${ctx.input.desiredStatus}` : ''}.`
    };
  })
  .build();
