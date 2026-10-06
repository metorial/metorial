import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getEndpoint = SlateTool.create(spec, {
  name: 'Get Endpoint',
  key: 'get_endpoint',
  description: `Retrieve a Serverless endpoint's type, configuration, autoscaling settings, and optional worker details. Queue-based endpoints also include worker and job health by default.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      endpointId: z
        .string()
        .describe('ID of the Serverless endpoint. Discover with list_endpoints.'),
      includeWorkers: z
        .boolean()
        .optional()
        .describe('Also retrieve worker details (default: false).'),
      includeHealth: z
        .boolean()
        .optional()
        .describe(
          'Fetch queue-based worker and job health (default: true). Load-balancing endpoints return health: null.'
        )
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Endpoint ID'),
      endpointType: z
        .string()
        .nullable()
        .describe('QUEUE supports job operations; LOAD_BALANCER serves a custom HTTP API.'),
      name: z.string().nullable().describe('Endpoint name'),
      computeType: z.string().nullable().describe('GPU or CPU'),
      gpuCount: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .nullable()
        .describe('GPUs per worker'),
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
      executionTimeoutMs: z.number().nullable().describe('Execution timeout in ms'),
      scalerType: z.string().nullable().describe('Autoscaling strategy'),
      scalerValue: z.number().nullable().describe('Scaler threshold'),
      templateId: z.string().nullable().describe('Template ID'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      imageName: z.string().nullable().describe('Container image.'),
      env: z.record(z.string(), z.string()).nullable().describe('Environment variables.'),
      workers: z
        .array(z.record(z.string(), z.any()))
        .nullable()
        .describe('Worker details when requested.'),
      networkVolumeIds: z.array(z.string()).describe('Attached network volumes.'),
      dataCenterIds: z.array(z.string()).describe('Preferred data centers.'),
      health: z
        .object({
          workersIdle: z.number().nullable(),
          workersRunning: z.number().nullable(),
          workersThrottled: z.number().nullable(),
          jobsCompleted: z.number().nullable(),
          jobsFailed: z.number().nullable(),
          jobsInProgress: z.number().nullable(),
          jobsInQueue: z.number().nullable(),
          jobsRetried: z.number().nullable()
        })
        .nullable()
        .describe('Endpoint health status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let includeHealth = ctx.input.includeHealth !== false;

    let e = await client.getEndpoint(ctx.input.endpointId, {
      includeTemplate: true,
      includeWorkers: ctx.input.includeWorkers === true
    });

    let health: any = null;
    if (includeHealth && e.type === 'QUEUE') {
      health = await client.getEndpointHealth(ctx.input.endpointId);
    }

    let output = {
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
      imageName: e.image ?? null,
      env: e.env ?? null,
      workers: e.workerDetails ?? null,
      networkVolumeIds: e.networkVolumes ?? [],
      dataCenterIds: e.dataCenterIds ?? [],
      health: health
        ? {
            workersIdle: health.workers?.idle ?? null,
            workersRunning: health.workers?.running ?? null,
            workersThrottled: health.workers?.throttled ?? null,
            jobsCompleted: health.jobs?.completed ?? null,
            jobsFailed: health.jobs?.failed ?? null,
            jobsInProgress: health.jobs?.inProgress ?? null,
            jobsInQueue: health.jobs?.inQueue ?? null,
            jobsRetried: health.jobs?.retried ?? null
          }
        : null
    };

    return {
      output,
      message: `Endpoint **${output.name ?? output.endpointId}** (${output.workersMin}-${output.workersMax} workers)${health ? `, ${health.workers?.running ?? 0} running` : ''}.`
    };
  })
  .build();
