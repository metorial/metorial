import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

let endpointSchema = z.object({
  endpointId: z.string().describe('Unique identifier for the endpoint'),
  name: z.string().nullable().describe('Name of the endpoint'),
  computeType: z.string().nullable().describe('GPU or CPU'),
  gpuCount: z.number().nullable().describe('Number of GPUs per worker'),
  gpuTypeIds: z.array(z.string()).nullable().describe('Accepted GPU models'),
  workersMin: z.number().nullable().describe('Minimum workers'),
  workersMax: z.number().nullable().describe('Maximum workers'),
  idleTimeout: z.number().nullable().describe('Idle timeout in seconds'),
  executionTimeoutMs: z.number().nullable().describe('Execution timeout in milliseconds'),
  scalerType: z.string().nullable().describe('Autoscaling strategy'),
  scalerValue: z.number().nullable().describe('Scaler threshold value'),
  templateId: z.string().nullable().describe('Template ID used'),
  createdAt: z.string().nullable().describe('Creation timestamp')
});

export let listEndpoints = SlateTool.create(spec, {
  name: 'List Endpoints',
  key: 'list_endpoints',
  description: `List all Serverless endpoints in your RunPod account. Returns endpoint configuration details including autoscaling settings, GPU types, and worker counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeTemplate: z.boolean().optional().describe('Include template details in response'),
      includeWorkers: z.boolean().optional().describe('Include worker Pod details in response')
    })
  )
  .output(
    z.object({
      endpoints: z.array(endpointSchema).describe('List of Serverless endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let result = await client.listEndpoints({
      includeTemplate: ctx.input.includeTemplate,
      includeWorkers: ctx.input.includeWorkers
    });

    let endpoints = Array.isArray(result) ? result : [];

    let mapped = endpoints.map((e: any) => ({
      endpointId: e.id,
      name: e.name ?? null,
      computeType: e.computeType ?? null,
      gpuCount: e.gpuCount ?? null,
      gpuTypeIds: e.gpuTypeIds ?? null,
      workersMin: e.workersMin ?? null,
      workersMax: e.workersMax ?? null,
      idleTimeout: e.idleTimeout ?? null,
      executionTimeoutMs: e.executionTimeoutMs ?? null,
      scalerType: e.scalerType ?? null,
      scalerValue: e.scalerValue ?? null,
      templateId: e.templateId ?? null,
      createdAt: e.createdAt ?? null
    }));

    return {
      output: { endpoints: mapped },
      message: `Found **${mapped.length}** Serverless endpoint(s).`
    };
  })
  .build();
