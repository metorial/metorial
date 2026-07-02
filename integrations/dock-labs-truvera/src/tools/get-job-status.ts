import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let getJobStatus = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Check the status of an asynchronous blockchain transaction job. Many operations (DID creation, registry creation, etc.) return a job ID that can be polled to check if the transaction has been finalized.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID returned from a blockchain transaction')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The job ID'),
      status: z
        .string()
        .optional()
        .describe('Current job status (e.g., finalized, processing)'),
      job: z.record(z.string(), z.unknown()).describe('Full job details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.getJob(ctx.input.jobId);
    let status = (result.status ?? 'unknown') as string;

    return {
      output: {
        jobId: ctx.input.jobId,
        status,
        job: result
      },
      message: `Job **${ctx.input.jobId}** status: **${status}**`
    };
  })
  .build();
