import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

let endpointSchema = z.object({
  endpointId: z.string().describe('Unique identifier for the endpoint'),
  endpointType: z
    .string()
    .nullable()
    .describe('QUEUE supports job operations; LOAD_BALANCER serves a custom HTTP API.'),
  name: z.string().nullable().describe('Name of the endpoint'),
  computeType: z.string().nullable().describe('GPU or CPU'),
  gpuCount: z
    .number()
    .refine(Number.isInteger, 'Must be an integer.')
    .min(1)
    .nullable()
    .describe('Number of GPUs per worker'),
  gpuTypeIds: z.array(z.string()).nullable().describe('Accepted GPU models'),
  gpuPoolIds: z.array(z.string()).nullable().describe('Accepted GPU pools.'),
  workersMin: z
    .number()
    .refine(Number.isInteger, 'Must be an integer.')
    .min(0)
    .nullable()
    .describe('Minimum workers'),
  workersMax: z
    .number()
    .refine(Number.isInteger, 'Must be an integer.')
    .min(0)
    .nullable()
    .describe('Maximum workers'),
  idleTimeout: z
    .number()
    .refine(Number.isInteger, 'Must be an integer.')
    .min(1)
    .max(3600)
    .nullable()
    .describe('Idle timeout in seconds'),
  executionTimeoutMs: z.number().nullable().describe('Execution timeout in milliseconds'),
  scalerType: z.string().nullable().describe('Autoscaling strategy'),
  scalerValue: z.number().nullable().describe('Scaler threshold value'),
  templateId: z.string().nullable().describe('Template ID used'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  workers: z
    .array(z.record(z.string(), z.any()))
    .nullable()
    .describe('Worker details when requested.')
});

export let listEndpoints = SlateTool.create(spec, {
  name: 'List Endpoints',
  key: 'list_endpoints',
  description: `List all Serverless endpoints in your Runpod account with their routing type, autoscaling settings, GPU types, and worker counts. Choose a QUEUE endpoint for job submission, status, streaming, and queue management.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeTemplate: z
        .boolean()
        .optional()
        .describe(
          'Retained for compatibility; current API always includes resolved container configuration.'
        ),
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
      endpointType: e.type ?? null,
      name: e.name ?? null,
      computeType: e.computeType ?? null,
      gpuCount: e.gpuCount ?? null,
      gpuTypeIds: e.gpuTypeIds ?? null,
      gpuPoolIds: e.gpuPoolIds ?? null,
      workersMin: e.workersMin ?? null,
      workersMax: e.workersMax ?? null,
      idleTimeout: e.idleTimeout ?? null,
      executionTimeoutMs: e.executionTimeoutMs ?? null,
      scalerType: e.scalerType ?? null,
      scalerValue: e.scalerValue ?? null,
      templateId: e.templateId ?? null,
      createdAt: e.createdAt ?? null,
      workers: e.workerDetails ?? null
    }));

    return {
      output: { endpoints: mapped },
      message: `Found **${mapped.length}** Serverless endpoint(s).`
    };
  })
  .build();
