import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let createEndpoint = SlateTool.create(spec, {
  name: 'Create Endpoint',
  key: 'create_endpoint',
  description: `Create a new Serverless endpoint for AI inference on RunPod. Configure autoscaling, GPU type, worker counts, and timeouts. Requires an existing template ID.`,
  instructions: [
    'A template must be created first before creating an endpoint.',
    'Scaler types: QUEUE_DELAY scales based on queue wait time; REQUEST_COUNT scales based on concurrent requests.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to use for endpoint workers'),
      name: z.string().optional().describe('Endpoint name (max 191 characters)'),
      computeType: z.enum(['GPU', 'CPU']).optional().describe('Compute type (default: GPU)'),
      gpuCount: z.number().optional().describe('GPUs per worker (default: 1)'),
      gpuTypeIds: z.array(z.string()).optional().describe('Accepted GPU model IDs'),
      cpuFlavorIds: z
        .array(z.string())
        .optional()
        .describe('CPU flavor IDs for CPU endpoints'),
      vcpuCount: z.number().optional().describe('vCPU count for CPU endpoints'),
      dataCenterIds: z.array(z.string()).optional().describe('Preferred data center IDs'),
      networkVolumeId: z.string().optional().describe('Network volume to attach'),
      executionTimeoutMs: z.number().optional().describe('Max execution time in milliseconds'),
      idleTimeout: z
        .number()
        .optional()
        .describe('Seconds before idle worker shutdown (1-3600, default: 5)'),
      workersMin: z.number().optional().describe('Minimum workers (default: 0)'),
      workersMax: z.number().optional().describe('Maximum workers'),
      scalerType: z
        .enum(['QUEUE_DELAY', 'REQUEST_COUNT'])
        .optional()
        .describe('Autoscaling strategy'),
      scalerValue: z.number().optional().describe('Scaling threshold value'),
      flashboot: z.boolean().optional().describe('Enable flash boot for faster startup')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('ID of the newly created endpoint'),
      name: z.string().nullable().describe('Endpoint name'),
      workersMin: z.number().nullable().describe('Minimum workers'),
      workersMax: z.number().nullable().describe('Maximum workers'),
      templateId: z.string().nullable().describe('Template ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let e = await client.createEndpoint({
      templateId: ctx.input.templateId,
      name: ctx.input.name,
      computeType: ctx.input.computeType,
      gpuCount: ctx.input.gpuCount,
      gpuTypeIds: ctx.input.gpuTypeIds,
      cpuFlavorIds: ctx.input.cpuFlavorIds,
      vcpuCount: ctx.input.vcpuCount,
      dataCenterIds: ctx.input.dataCenterIds,
      networkVolumeId: ctx.input.networkVolumeId,
      executionTimeoutMs: ctx.input.executionTimeoutMs,
      idleTimeout: ctx.input.idleTimeout,
      workersMin: ctx.input.workersMin,
      workersMax: ctx.input.workersMax,
      scalerType: ctx.input.scalerType,
      scalerValue: ctx.input.scalerValue,
      flashboot: ctx.input.flashboot
    });

    let output = {
      endpointId: e.id,
      name: e.name ?? null,
      workersMin: e.workersMin ?? null,
      workersMax: e.workersMax ?? null,
      templateId: e.templateId ?? null
    };

    return {
      output,
      message: `Created endpoint **${output.name ?? output.endpointId}** with ${output.workersMin}-${output.workersMax} workers.`
    };
  })
  .build();
