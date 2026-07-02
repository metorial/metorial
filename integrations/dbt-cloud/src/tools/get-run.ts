import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let getRunTool = SlateTool.create(spec, {
  name: 'Get Run',
  key: 'get_run',
  description: `Retrieve detailed information about a specific dbt Cloud job run. Returns status, timing, duration, git info, run steps, and execution details. Use this to monitor a triggered run or inspect a completed run's results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      runId: z.string().describe('The unique ID of the run to retrieve'),
      includeRelated: z
        .array(z.enum(['trigger', 'job', 'audit', 'debug_logs']))
        .optional()
        .describe('Related resources to include (trigger, job, audit, debug_logs)')
    })
  )
  .output(
    z.object({
      runId: z.number().describe('Unique run identifier'),
      jobId: z.number().describe('Job that produced this run'),
      projectId: z.number().describe('Project the run belongs to'),
      environmentId: z.number().describe('Environment the run executed in'),
      status: z
        .number()
        .describe(
          'Run status code (1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled)'
        ),
      statusHumanized: z.string().optional().describe('Human-readable status'),
      dbtVersion: z.string().optional().describe('dbt version used'),
      gitSha: z.string().nullable().optional().describe('Git SHA used for this run'),
      gitBranch: z.string().nullable().optional().describe('Git branch used for this run'),
      startedAt: z.string().nullable().optional().describe('Run start timestamp'),
      finishedAt: z.string().nullable().optional().describe('Run finish timestamp'),
      duration: z.string().optional().describe('Run duration'),
      durationHumanized: z.string().optional().describe('Human-readable run duration'),
      href: z.string().nullable().optional().describe('URL to view the run in dbt Cloud'),
      runSteps: z.array(z.any()).optional().describe('Individual step details if included'),
      trigger: z.any().optional().describe('Trigger information if included'),
      job: z.any().optional().describe('Job details if included'),
      createdAt: z.string().optional().describe('Run creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let run = await client.getRun(ctx.input.runId, {
      include_related: ctx.input.includeRelated
    });

    return {
      output: {
        runId: run.id,
        jobId: run.job_definition_id ?? run.job_id,
        projectId: run.project_id,
        environmentId: run.environment_id,
        status: run.status,
        statusHumanized: run.status_humanized,
        dbtVersion: run.dbt_version,
        gitSha: run.git_sha ?? null,
        gitBranch: run.git_branch ?? null,
        startedAt: run.started_at ?? null,
        finishedAt: run.finished_at ?? null,
        duration: run.duration,
        durationHumanized: run.duration_humanized,
        href: run.href ?? null,
        runSteps: run.run_steps,
        trigger: run.trigger,
        job: run.job,
        createdAt: run.created_at
      },
      message: `Run **#${run.id}** — Status: **${run.status_humanized || run.status}**${run.duration_humanized ? `, Duration: ${run.duration_humanized}` : ''}.`
    };
  })
  .build();
