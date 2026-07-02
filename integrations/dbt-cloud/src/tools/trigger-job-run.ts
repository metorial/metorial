import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let triggerJobRunTool = SlateTool.create(spec, {
  name: 'Trigger Job Run',
  key: 'trigger_job_run',
  description: `Trigger a new run for a dbt Cloud job. Supports overriding dbt version, threads, target name, timeout, doc generation, and execution steps. If the job is already running, the new run will be enqueued. Returns the created run's details including its ID for monitoring.`,
  instructions: [
    'Provide a descriptive "cause" so runs can be traced back to their origin.',
    'Use step overrides to run specific dbt commands instead of the job defaults.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...accountIdInput,
      jobId: z.string().describe('The ID of the job to trigger'),
      cause: z
        .string()
        .describe(
          'Reason for triggering the run (required by dbt Cloud and shown in run history)'
        ),
      gitSha: z.string().optional().describe('Git SHA to checkout before running'),
      gitBranch: z.string().optional().describe('Git branch to checkout before running'),
      azurePullRequestId: z
        .number()
        .optional()
        .describe('Azure DevOps pull request ID associated with this run'),
      githubPullRequestId: z
        .number()
        .optional()
        .describe('GitHub pull request ID associated with this run'),
      gitlabMergeRequestId: z
        .number()
        .optional()
        .describe('GitLab merge request ID associated with this run'),
      nonNativePullRequestId: z
        .number()
        .optional()
        .describe('Non-native pull request ID associated with this run'),
      schemaOverride: z
        .string()
        .optional()
        .describe('Override the target schema for this run'),
      dbtVersionOverride: z
        .string()
        .optional()
        .describe('Override the dbt version for this run'),
      threadsOverride: z.number().optional().describe('Override the number of threads'),
      targetNameOverride: z
        .string()
        .optional()
        .describe('Override the target.name context variable'),
      generateDocsOverride: z
        .boolean()
        .optional()
        .describe('Override whether docs are generated'),
      timeoutSecondsOverride: z
        .number()
        .optional()
        .describe('Override the run timeout in seconds'),
      stepsOverride: z
        .array(z.string())
        .optional()
        .describe('Override the list of dbt commands to execute')
    })
  )
  .output(
    z.object({
      runId: z.number().describe('Unique identifier of the created run'),
      jobId: z.number().describe('Job this run belongs to'),
      projectId: z.number().describe('Project this run belongs to'),
      environmentId: z.number().describe('Environment this run executes in'),
      status: z
        .number()
        .describe(
          'Run status code (1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled)'
        ),
      statusHumanized: z.string().optional().describe('Human-readable run status'),
      href: z.string().nullable().optional().describe('URL to view the run in dbt Cloud'),
      createdAt: z.string().optional().describe('Run creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let run = await client.triggerJobRun(ctx.input.jobId, {
      cause: ctx.input.cause,
      gitSha: ctx.input.gitSha,
      gitBranch: ctx.input.gitBranch,
      azurePullRequestId: ctx.input.azurePullRequestId,
      githubPullRequestId: ctx.input.githubPullRequestId,
      gitlabMergeRequestId: ctx.input.gitlabMergeRequestId,
      nonNativePullRequestId: ctx.input.nonNativePullRequestId,
      schemaOverride: ctx.input.schemaOverride,
      dbtVersionOverride: ctx.input.dbtVersionOverride,
      threadsOverride: ctx.input.threadsOverride,
      targetNameOverride: ctx.input.targetNameOverride,
      generateDocsOverride: ctx.input.generateDocsOverride,
      timeoutSecondsOverride: ctx.input.timeoutSecondsOverride,
      stepsOverride: ctx.input.stepsOverride
    });

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
      message: `Triggered run **#${run.id}** for job ${ctx.input.jobId}. Status: **${run.status_humanized || 'Queued'}**.`
    };
  })
  .build();
