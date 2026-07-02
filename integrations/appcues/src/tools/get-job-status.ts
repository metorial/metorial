import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let getJobStatus = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Check the status of an asynchronous job in Appcues. Many operations like bulk imports, exports, segment membership changes, and user deletions are processed asynchronously and return a job ID. Use this tool to monitor job progress and completion.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The ID of the job to check')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The job ID'),
      name: z.string().optional().describe('Name/type of the job'),
      status: z.string().optional().describe('Current status of the job'),
      startedAt: z.string().optional().describe('When the job started'),
      url: z.string().optional().describe('URL for retrieving job results'),
      events: z.array(z.any()).optional().describe('Detailed progress events for the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let job = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: job.id || ctx.input.jobId,
        name: job.name || undefined,
        status: job.status || undefined,
        startedAt: job.started_at || undefined,
        url: job.url || undefined,
        events: job.events || undefined
      },
      message: `Job \`${ctx.input.jobId}\`: **${job.status || 'unknown'}**${job.name ? ` (${job.name})` : ''}.`
    };
  })
  .build();
