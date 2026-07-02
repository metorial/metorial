import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopJob = SlateTool.create(spec, {
  name: 'Stop Job',
  key: 'stop_job',
  description: `Stop a currently running scraping, crawling, or monitoring job. Any results collected before stopping will still be available.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique identifier of the job to stop.')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The stopped job ID.'),
      status: z.string().describe('Updated job status (e.g. "stopped").')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.stopJob(ctx.input.jobId);

    return {
      output: {
        jobId: result.job_id || ctx.input.jobId,
        status: result.status || 'stopped'
      },
      message: `Stopped job **${ctx.input.jobId}**. Status: ${result.status || 'stopped'}.`
    };
  })
  .build();
