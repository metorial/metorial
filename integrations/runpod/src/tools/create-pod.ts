import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let createPod = SlateTool.create(spec, {
  name: 'Create Pod',
  key: 'create_pod',
  description: `Create a new GPU or CPU Pod on Runpod. Specify the container image, GPU type, disk sizes, ports, and environment variables. Creates on-demand instances. Spot deployment is currently available through the Runpod console.`,
  instructions: [
    'Common GPU types include: "NVIDIA A100-SXM4-80GB", "NVIDIA H100 80GB HBM3", "NVIDIA RTX A6000", "NVIDIA GeForce RTX 4090".',
    'Port format is "port/protocol", e.g. "8888/http" or "22/tcp".',
    'For CPU pods, set computeType to "CPU" and provide cpuFlavorIds instead of gpuTypeIds.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().min(1).optional().describe('Name for the Pod'),
      imageName: z
        .string()
        .describe(
          'Container image to use, e.g. "runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04"'
        ),
      cloudType: z
        .enum(['SECURE', 'COMMUNITY'])
        .optional()
        .describe('Cloud type: SECURE (default) or COMMUNITY'),
      computeType: z
        .enum(['GPU', 'CPU'])
        .optional()
        .describe('Compute type: GPU (default) or CPU'),
      gpuTypeIds: z
        .array(z.string())
        .optional()
        .describe('Exactly one GPU ID. Call list_compute_types to discover GPU IDs.'),
      gpuCount: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .optional()
        .describe('Number of GPUs (default: 1)'),
      cpuFlavorIds: z
        .array(z.string())
        .optional()
        .describe('Exactly one CPU ID for CPU Pods. Call list_compute_types to discover IDs.'),
      vcpuCount: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(2)
        .optional()
        .describe('Number of vCPUs for CPU pods'),
      containerDiskInGb: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .optional()
        .describe('Container disk size in GB'),
      volumeInGb: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(10)
        .optional()
        .describe('Host-local persistent volume size in GB. Available for GPU Pods only.'),
      volumeMountPath: z
        .string()
        .min(1)
        .optional()
        .describe('Volume mount path (default: /workspace)'),
      dockerEntrypoint: z
        .array(z.string())
        .optional()
        .describe('Override the image entrypoint in exec form.'),
      dockerStartCmd: z
        .array(z.string())
        .optional()
        .describe('Container command or entrypoint arguments in exec form.'),
      containerRegistryAuthId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Registry credential ID for a private image. Call list_container_registry_auths to discover IDs.'
        ),
      minRAMPerGPU: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .optional()
        .describe('Minimum RAM per GPU in GB'),
      minVCPUPerGPU: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .optional()
        .describe('Minimum vCPUs per GPU'),
      ports: z
        .array(z.string())
        .optional()
        .describe('Exposed ports, e.g. ["8888/http", "22/tcp"]'),
      env: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables as key-value pairs'),
      interruptible: z
        .boolean()
        .optional()
        .describe(
          'Retained for compatibility. The current REST API rejects true; use the console for spot deployment.'
        ),
      dataCenterIds: z
        .array(z.string())
        .optional()
        .describe('Preferred data center IDs. Call list_data_centers to discover locations.'),
      networkVolumeId: z.string().optional().describe('Network volume ID to attach')
    })
  )
  .output(
    z.object({
      podId: z.string().describe('ID of the newly created Pod'),
      name: z.string().nullable().describe('Name of the Pod'),
      desiredStatus: z.string().nullable().describe('Current status'),
      imageName: z.string().nullable().describe('Container image'),
      costPerHr: z.number().nullable().describe('Cost per hour in USD'),
      gpuCount: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .nullable()
        .describe('Number of GPUs'),
      gpuType: z.string().nullable().describe('GPU model type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let p = await client.createPod({
      name: ctx.input.name,
      imageName: ctx.input.imageName,
      cloudType: ctx.input.cloudType,
      computeType: ctx.input.computeType,
      gpuTypeIds: ctx.input.gpuTypeIds,
      gpuCount: ctx.input.gpuCount,
      cpuFlavorIds: ctx.input.cpuFlavorIds,
      vcpuCount: ctx.input.vcpuCount,
      containerDiskInGb: ctx.input.containerDiskInGb,
      volumeInGb: ctx.input.volumeInGb,
      volumeMountPath: ctx.input.volumeMountPath,
      dockerEntrypoint: ctx.input.dockerEntrypoint,
      dockerStartCmd: ctx.input.dockerStartCmd,
      containerRegistryAuthId: ctx.input.containerRegistryAuthId,
      minRAMPerGPU: ctx.input.minRAMPerGPU,
      minVCPUPerGPU: ctx.input.minVCPUPerGPU,
      ports: ctx.input.ports,
      env: ctx.input.env,
      interruptible: ctx.input.interruptible,
      dataCenterIds: ctx.input.dataCenterIds,
      networkVolumeId: ctx.input.networkVolumeId
    });

    let output = {
      podId: p.id,
      name: p.name ?? null,
      desiredStatus: p.desiredStatus ?? null,
      imageName: p.imageName ?? p.image ?? null,
      costPerHr: p.costPerHr ?? null,
      gpuCount: p.gpu?.count ?? p.gpuCount ?? null,
      gpuType: p.gpu?.gpuTypeId ?? p.gpuTypeId ?? null
    };

    return {
      output,
      message: `Created Pod **${output.name ?? output.podId}**${output.costPerHr ? ` at $${output.costPerHr}/hr` : ''}.`
    };
  })
  .build();
