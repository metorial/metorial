import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getJobStatus = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Check the status and results of a Serverless job. Use this to poll for completion after submitting an asynchronous job. Returns the job's current status and output if completed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      endpointId: z.string().describe('Endpoint ID from list_endpoints.'),
      jobId: z.string().describe('Job ID returned by run_job.')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('Endpoint that owns the job.'),
      error: z.any().nullable().describe('Provider job error when processing failed.'),
      delayTime: z.number().nullable().describe('Time waiting in queue, in milliseconds.'),
      jobId: z.string().describe('Job identifier'),
      status: z
        .string()
        .describe(
          'Job status: IN_QUEUE, IN_PROGRESS, RUNNING, COMPLETED, FAILED, CANCELLED, TIMED_OUT'
        ),
      jobOutput: z.any().nullable().describe('Job output (present when completed)'),
      executionTime: z.number().nullable().describe('Execution time in ms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let result = await client.getJobStatus(ctx.input.endpointId, ctx.input.jobId);

    let output = {
      endpointId: ctx.input.endpointId,
      error: result.error ?? null,
      delayTime: result.delayTime ?? null,
      jobId: result.id,
      status: result.status,
      jobOutput: result.output ?? null,
      executionTime: result.executionTime ?? null
    };

    return {
      output,
      message: `Job **${output.jobId}** is **${output.status}**${output.executionTime ? ` (${output.executionTime}ms)` : ''}.`
    };
  })
  .build();
