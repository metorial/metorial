import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let cancelJobTool = SlateTool.create(spec, {
  name: 'Cancel Job',
  key: 'cancel_job',
  description: `Cancel a running Airbyte sync or reset job. Returns the updated job status after cancellation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.number().describe('The numeric ID of the job to cancel.')
    })
  )
  .output(
    z.object({
      jobId: z.number(),
      status: z.string(),
      jobType: z.string(),
      connectionId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let job = await client.cancelJob(ctx.input.jobId);

    return {
      output: {
        jobId: job.jobId,
        status: job.status,
        jobType: job.jobType,
        connectionId: job.connectionId
      },
      message: `Cancelled job **${job.jobId}** (status: ${job.status}).`
    };
  })
  .build();
