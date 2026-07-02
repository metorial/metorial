import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getPod = SlateTool.create(spec, {
  name: 'Get Pod',
  key: 'get_pod',
  description: `Retrieve detailed information about a specific Pod by its ID, including its configuration, status, GPU details, networking, and attached volumes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      podId: z.string().describe('ID of the Pod to retrieve')
    })
  )
  .output(
    z.object({
      podId: z.string().describe('Unique identifier for the Pod'),
      name: z.string().nullable().describe('User-defined name'),
      desiredStatus: z.string().nullable().describe('Current status'),
      imageName: z.string().nullable().describe('Container image'),
      costPerHr: z.number().nullable().describe('Cost per hour in USD'),
      vcpuCount: z.number().nullable().describe('Number of vCPUs'),
      memoryInGb: z.number().nullable().describe('Memory in GB'),
      containerDiskInGb: z.number().nullable().describe('Container disk in GB'),
      volumeInGb: z.number().nullable().describe('Persistent volume in GB'),
      gpuCount: z.number().nullable().describe('Number of GPUs'),
      gpuType: z.string().nullable().describe('GPU model type'),
      publicIp: z.string().nullable().describe('Public IP address'),
      ports: z.array(z.string()).nullable().describe('Exposed port mappings'),
      env: z.record(z.string(), z.string()).nullable().describe('Environment variables'),
      networkVolumeId: z.string().nullable().describe('Attached network volume ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let p = await client.getPod(ctx.input.podId, {
      includeMachine: true,
      includeNetworkVolume: true,
      includeTemplate: true
    });

    let output = {
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
      gpuType: p.gpu?.gpuTypeId ?? p.gpuTypeId ?? null,
      publicIp: p.publicIp ?? null,
      ports: p.ports ?? null,
      env: p.env ?? null,
      networkVolumeId: p.networkVolume?.id ?? null
    };

    return {
      output,
      message: `Pod **${output.name ?? output.podId}** is **${output.desiredStatus ?? 'unknown'}**${output.gpuType ? ` with ${output.gpuCount ?? 1}x ${output.gpuType}` : ''}.`
    };
  })
  .build();
