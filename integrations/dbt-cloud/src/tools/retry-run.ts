import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let retryRunTool = SlateTool.create(spec, {
  name: 'Retry Run',
  key: 'retry_run',
  description: `Retry a failed dbt Cloud run. dbt Cloud enqueues a new run and returns its run ID and status so it can be monitored with get_run.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...accountIdInput,
      runId: z.string().describe('The failed run ID to retry')
    })
  )
  .output(
    z.object({
      runId: z.number().describe('Unique identifier of the enqueued retry run'),
      jobId: z.number().describe('Job this retry run belongs to'),
      projectId: z.number().describe('Project this retry run belongs to'),
      environmentId: z.number().describe('Environment this retry run executes in'),
      status: z.number().describe('Run status code'),
      statusHumanized: z.string().optional().describe('Human-readable run status'),
      href: z.string().nullable().optional().describe('URL to view the run in dbt Cloud'),
      createdAt: z.string().optional().describe('Run creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let run = await client.retryRun(ctx.input.runId);

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
      message: `Retried run #${ctx.input.runId}; new run is **#${run.id}**.`
    };
  })
  .build();
