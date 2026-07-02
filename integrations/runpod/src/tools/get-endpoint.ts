import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getEndpoint = SlateTool.create(spec, {
  name: 'Get Endpoint',
  key: 'get_endpoint',
  description: `Retrieve detailed information about a specific Serverless endpoint including its configuration, autoscaling settings, template, and health status. Also fetches endpoint health for operational insights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      endpointId: z.string().describe('ID of the Serverless endpoint'),
      includeHealth: z
        .boolean()
        .optional()
        .describe('Also fetch endpoint health status (default: true)')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Endpoint ID'),
      name: z.string().nullable().describe('Endpoint name'),
      computeType: z.string().nullable().describe('GPU or CPU'),
      gpuCount: z.number().nullable().describe('GPUs per worker'),
      gpuTypeIds: z.array(z.string()).nullable().describe('Accepted GPU models'),
      workersMin: z.number().nullable().describe('Minimum workers'),
      workersMax: z.number().nullable().describe('Maximum workers'),
      idleTimeout: z.number().nullable().describe('Idle timeout in seconds'),
      executionTimeoutMs: z.number().nullable().describe('Execution timeout in ms'),
      scalerType: z.string().nullable().describe('Autoscaling strategy'),
      scalerValue: z.number().nullable().describe('Scaler threshold'),
      templateId: z.string().nullable().describe('Template ID'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
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
      includeWorkers: true
    });

    let health: any = null;
    if (includeHealth) {
      try {
        health = await client.getEndpointHealth(ctx.input.endpointId);
      } catch {
        // Health endpoint may fail for newly created endpoints
      }
    }

    let output = {
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
      createdAt: e.createdAt ?? null,
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
