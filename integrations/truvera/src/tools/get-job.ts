import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job',
  description: `Check the status of an asynchronous blockchain operation. Operations like DID creation, schema registration, and registry management return a job ID that can be polled for completion status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The job ID returned by a previous operation')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The job ID'),
      status: z.string().optional().describe('Current job status'),
      job: z.any().describe('Full job details and result data')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: ctx.input.jobId,
        status: result?.status,
        job: result
      },
      message: `Job **${ctx.input.jobId}** status: **${result?.status || 'unknown'}**.`
    };
  })
  .build();
