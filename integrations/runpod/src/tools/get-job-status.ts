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
      endpointId: z.string().describe('ID of the Serverless endpoint'),
      jobId: z.string().describe('Job ID to check status for')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job identifier'),
      status: z
        .string()
        .describe(
          'Job status: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, TIMED_OUT'
        ),
      jobOutput: z.any().nullable().describe('Job output (present when completed)'),
      executionTime: z.number().nullable().describe('Execution time in ms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });

    let result = await client.getJobStatus(ctx.input.endpointId, ctx.input.jobId);

    let output = {
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
