import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Get details about a specific job, or cancel, restart, or debug it. Debug mode restarts the job with SSH access enabled for troubleshooting.`,
  instructions: [
    'Debug mode is only available on travis-ci.com and select travis-ci.org repositories.'
  ]
})
  .input(
    z.object({
      jobId: z.string().describe('Numeric job ID.'),
      action: z
        .enum(['get', 'cancel', 'restart', 'debug'])
        .default('get')
        .describe('Action to perform on the job.')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('Job ID'),
      state: z.string().optional().describe('Job state'),
      number: z.string().optional().describe('Job number'),
      startedAt: z.string().nullable().optional().describe('Job start timestamp'),
      finishedAt: z.string().nullable().optional().describe('Job finish timestamp'),
      buildId: z.number().optional().describe('Associated build ID'),
      repositorySlug: z.string().optional().describe('Repository slug'),
      queue: z.string().optional().describe('Job queue'),
      allowFailure: z.boolean().optional().describe('Whether this job is allowed to fail')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: any;
    let actionLabel = 'Retrieved';

    switch (ctx.input.action) {
      case 'cancel':
        result = await client.cancelJob(ctx.input.jobId);
        actionLabel = 'Cancelled';
        break;
      case 'restart':
        result = await client.restartJob(ctx.input.jobId);
        actionLabel = 'Restarted';
        break;
      case 'debug':
        result = await client.debugJob(ctx.input.jobId);
        actionLabel = 'Started debug session for';
        break;
      default:
        result = await client.getJob(ctx.input.jobId);
        break;
    }

    let job = result.job || result;

    return {
      output: {
        jobId: job.id || Number(ctx.input.jobId),
        state: job.state,
        number: job.number,
        startedAt: job.started_at ?? null,
        finishedAt: job.finished_at ?? null,
        buildId: job.build?.id,
        repositorySlug: job.repository?.slug,
        queue: job.queue,
        allowFailure: job.allow_failure
      },
      message: `${actionLabel} job **#${job.number || ctx.input.jobId}** (state: ${job.state || 'pending'}).`
    };
  })
  .build();
