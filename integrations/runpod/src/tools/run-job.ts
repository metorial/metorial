import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let runJob = SlateTool.create(spec, {
  name: 'Run Serverless Job',
  key: 'run_job',
  description: `Submit a job to a Serverless endpoint. Choose between **synchronous** execution (waits for result, best for quick tasks under 30s) or **asynchronous** execution (returns immediately with a job ID for polling). Optionally specify a webhook URL to receive results when complete.`,
  instructions: [
    'Use synchronous mode for quick inference tasks (under 30 seconds).',
    'Use asynchronous mode for long-running tasks; poll the job status using the Get Job Status tool.',
    'The input payload depends on the specific model/handler deployed at the endpoint.'
  ],
  constraints: [
    'Sync mode: 2000 requests/10s, 400 concurrent. Results available for 1 minute.',
    'Async mode: 1000 requests/10s, 200 concurrent. Results available for 30 minutes.'
  ]
})
  .input(
    z.object({
      endpointId: z.string().describe('ID of the Serverless endpoint to submit the job to'),
      jobInput: z
        .record(z.string(), z.any())
        .describe('Input payload for the handler (model-specific parameters)'),
      synchronous: z
        .boolean()
        .optional()
        .describe('Run synchronously and wait for result (default: false)'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST callback when the job completes'),
      executionTimeout: z
        .number()
        .optional()
        .describe('Max execution time in ms once a worker picks up the job'),
      ttl: z.number().optional().describe('Total job lifespan in ms from submission'),
      lowPriority: z.boolean().optional().describe('Submit as low priority job')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z
        .string()
        .describe(
          'Job status: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, TIMED_OUT'
        ),
      jobOutput: z
        .any()
        .nullable()
        .describe('Job output (only present for synchronous completed jobs)'),
      executionTime: z
        .number()
        .nullable()
        .describe('Execution time in ms (only for completed jobs)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let payload: any = {
      input: ctx.input.jobInput
    };

    if (ctx.input.webhookUrl) {
      payload.webhook = ctx.input.webhookUrl;
    }

    if (ctx.input.executionTimeout || ctx.input.ttl || ctx.input.lowPriority !== undefined) {
      payload.policy = {
        executionTimeout: ctx.input.executionTimeout,
        ttl: ctx.input.ttl,
        lowPriority: ctx.input.lowPriority
      };
    }

    let result: any;
    if (ctx.input.synchronous) {
      result = await client.runSyncJob(ctx.input.endpointId, payload);
    } else {
      result = await client.runJob(ctx.input.endpointId, payload);
    }

    let output = {
      jobId: result.id,
      status: result.status,
      jobOutput: result.output ?? null,
      executionTime: result.executionTime ?? null
    };

    let message =
      ctx.input.synchronous && result.status === 'COMPLETED'
        ? `Job **${output.jobId}** completed in ${output.executionTime}ms.`
        : `Job **${output.jobId}** submitted with status **${output.status}**.`;

    return { output, message };
  })
  .build();
