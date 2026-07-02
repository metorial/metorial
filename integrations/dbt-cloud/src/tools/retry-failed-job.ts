import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let retryFailedJobTool = SlateTool.create(spec, {
  name: 'Retry Failed Job',
  key: 'retry_failed_job',
  description: `Retry the latest failed run for a dbt Cloud job from the point of failure when possible. If dbt Cloud cannot retry from failure, it enqueues a normal job run.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...accountIdInput,
      jobId: z.string().describe('The job ID whose failed run should be retried')
    })
  )
  .output(
    z.object({
      runId: z.number().describe('Unique identifier of the enqueued run'),
      jobId: z.number().describe('Job this run belongs to'),
      projectId: z.number().describe('Project this run belongs to'),
      environmentId: z.number().describe('Environment this run executes in'),
      status: z.number().describe('Run status code'),
      statusHumanized: z.string().optional().describe('Human-readable run status'),
      href: z.string().nullable().optional().describe('URL to view the run in dbt Cloud'),
      createdAt: z.string().optional().describe('Run creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let run = await client.retryFailedJob(ctx.input.jobId);

    return {
      output: {
        runId: run.id,
        jobId: run.job_definition_id ?? run.job_id,
        projectId: run.project_id,
        environmentId: run.environment_id,
        status: run.status,
        statusHumanized: run.status_humanized,
        href: run.href ?? null,
        createdAt: run.created_at
      },
      message: `Enqueued retry run **#${run.id}** for job ${ctx.input.jobId}.`
    };
  })
  .build();
