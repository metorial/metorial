import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import type { Job } from '../lib/types';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

const mapJob = (j: Job) => ({
  jobId: j.id,
  name: j.name,
  status: j.status,
  conclusion: j.conclusion,
  startedAt: j.started_at,
  completedAt: j.completed_at,
  runnerName: j.runner_name,
  steps: (j.steps ?? []).map(s => ({
    name: s.name,
    status: s.status,
    conclusion: s.conclusion,
    number: s.number,
    startedAt: s.started_at ?? null,
    completedAt: s.completed_at ?? null
  }))
});

export let getWorkflowRun = SlateTool.create(spec, {
  name: 'Get Workflow Run',
  key: 'get_workflow_run',
  description: `Get detailed information about a specific workflow run, including its status, conclusion, timing, and associated commit. Can include one page of jobs from the latest attempt and their step-level details; use jobsNextPage to retrieve additional jobs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID'),
      jobsPage: z
        .number()
        .optional()
        .describe('Job results page (default 1); applies when includeJobs is true'),
      jobsPerPage: z.number().optional().describe('Jobs per page (1-100, default 30)'),
      includeJobs: z
        .boolean()
        .optional()
        .describe('Whether to include jobs and their steps (default false)')
    })
  )
  .output(
    z.object({
      runId: z.number().describe('Workflow run ID'),
      name: z.string().nullable().describe('Workflow run name'),
      displayTitle: z
        .string()
        .optional()
        .describe('Display title from the workflow run-name or event'),
      workflowId: z.number().describe('Workflow ID'),
      headBranch: z.string().nullable().describe('Head branch'),
      headSha: z.string().describe('Head commit SHA'),
      status: z.string().nullable().describe('Run status'),
      conclusion: z.string().nullable().describe('Run conclusion'),
      event: z.string().describe('Triggering event'),
      runNumber: z.number().describe('Run number'),
      runAttempt: z.number().optional().describe('Current run attempt'),
      htmlUrl: z.string().describe('URL to the run'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      runStartedAt: z.string().nullable().describe('When the run started executing'),
      actor: z.string().nullable().describe('User who triggered the run'),
      triggeringActor: z.string().nullable().describe('User whose action triggered the run'),
      jobsTotalCount: z.number().optional().describe('Total jobs for the latest run attempt'),
      jobsNextPage: z.number().optional().describe('Next jobs page, when more results exist'),
      jobs: z
        .array(
          z.object({
            jobId: z.number().describe('Job ID'),
            name: z.string().describe('Job name'),
            status: z.string().describe('Job status'),
            conclusion: z.string().nullable().describe('Job conclusion'),
            startedAt: z.string().nullable().describe('Job start time'),
            completedAt: z.string().nullable().describe('Job completion time'),
            runnerName: z.string().nullable().describe('Runner name'),
            steps: z
              .array(
                z.object({
                  name: z.string().describe('Step name'),
                  status: z.string().describe('Step status'),
                  conclusion: z.string().nullable().describe('Step conclusion'),
                  number: z.number().describe('Step number'),
                  startedAt: z.string().nullable().describe('Step start time'),
                  completedAt: z.string().nullable().describe('Step completion time')
                })
              )
              .optional()
              .describe('Steps within the job')
          })
        )
        .optional()
        .describe('Jobs in the workflow run')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new GitHubActionsClient(ctx.auth.token);
    let run = await client.getWorkflowRun(ctx.input.owner, ctx.input.repo, ctx.input.runId);

    let jobs: ReturnType<typeof mapJob>[] | undefined;
    let jobsTotalCount: number | undefined;
    let jobsNextPage: number | undefined;
    if (ctx.input.includeJobs) {
      let jobsData = await client.listJobsForRun(
        ctx.input.owner,
        ctx.input.repo,
        ctx.input.runId,
        { page: ctx.input.jobsPage, perPage: ctx.input.jobsPerPage }
      );
      jobsTotalCount = jobsData.total_count;
      const page = ctx.input.jobsPage ?? 1;
      if (page * (ctx.input.jobsPerPage ?? 30) < jobsTotalCount) jobsNextPage = page + 1;
      jobs = jobsData.jobs.map(mapJob);
    }

    let statusText = run.conclusion ?? run.status ?? 'unknown';

    return {
      output: {
        runId: run.id,
        name: run.name ?? null,
        displayTitle: run.display_title,
        workflowId: run.workflow_id,
        headBranch: run.head_branch,
        headSha: run.head_sha,
        status: run.status,
        conclusion: run.conclusion,
        event: run.event,
        runNumber: run.run_number,
        runAttempt: run.run_attempt,
        htmlUrl: run.html_url,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        runStartedAt: run.run_started_at ?? null,
        actor: run.actor?.login ?? null,
        triggeringActor: run.triggering_actor?.login ?? null,
        jobsTotalCount,
        jobsNextPage,
        jobs
      },
      message: `Workflow run **#${run.run_number}** (${run.name}) is **${statusText}**.${jobs ? ` Includes ${jobs.length} jobs.` : ''}`
    };
  })
  .build();
