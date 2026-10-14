import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description:
    'List recent asynchronous import, export, membership, and deletion jobs in the account. Returns job IDs and status so you can inspect progress with Get Job Status.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('The job ID for Get Job Status'),
            name: z.string().describe('Name or type of the job'),
            status: z.string().describe('Current job status'),
            startedAt: z.string().optional().describe('When the job started'),
            url: z.string().optional().describe('URL for the job resource')
          })
        )
        .describe('Recent jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });
    let jobs = await client.listJobs();
    return {
      output: {
        jobs: jobs.map(job => ({
          jobId: job.id,
          name: job.name,
          status: job.status,
          startedAt: job.started_at || undefined,
          url: job.url || undefined
        }))
      },
      message: `Found **${jobs.length}** recent jobs.`
    };
  })
  .build();
