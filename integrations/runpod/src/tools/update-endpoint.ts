import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let updateEndpoint = SlateTool.create(spec, {
  name: 'Update Endpoint',
  key: 'update_endpoint',
  description: `Update a Serverless endpoint's configuration including autoscaling parameters, GPU type, worker limits, and timeouts.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      endpointId: z.string().describe('ID of the endpoint to update'),
      templateId: z.string().optional().describe('New template ID'),
      name: z.string().optional().describe('New endpoint name'),
      computeType: z.enum(['GPU', 'CPU']).optional().describe('Compute type'),
      gpuCount: z.number().optional().describe('GPUs per worker'),
      gpuTypeIds: z.array(z.string()).optional().describe('Accepted GPU model IDs'),
      cpuFlavorIds: z.array(z.string()).optional().describe('CPU flavor IDs'),
      vcpuCount: z.number().optional().describe('vCPU count'),
      dataCenterIds: z.array(z.string()).optional().describe('Data center IDs'),
      networkVolumeId: z.string().optional().describe('Network volume ID'),
      executionTimeoutMs: z.number().optional().describe('Execution timeout in ms'),
      idleTimeout: z.number().optional().describe('Idle timeout in seconds'),
      workersMin: z.number().optional().describe('Minimum workers'),
      workersMax: z.number().optional().describe('Maximum workers'),
      scalerType: z
        .enum(['QUEUE_DELAY', 'REQUEST_COUNT'])
        .optional()
        .describe('Autoscaling strategy'),
      scalerValue: z.number().optional().describe('Scaler threshold'),
      flashboot: z.boolean().optional().describe('Enable flash boot')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('ID of the updated endpoint'),
      name: z.string().nullable().describe('Updated name'),
      workersMin: z.number().nullable().describe('Minimum workers'),
      workersMax: z.number().nullable().describe('Maximum workers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let { endpointId, ...updateData } = ctx.input;

    let e = await client.updateEndpoint(endpointId, updateData);

    let output = {
      endpointId: e.id,
      name: e.name ?? null,
      workersMin: e.workersMin ?? null,
      workersMax: e.workersMax ?? null
    };

    return {
      output,
      message: `Updated endpoint **${output.name ?? output.endpointId}**.`
    };
  })
  .build();
