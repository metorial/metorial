import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

let workflowRunSchema = z.object({
  runId: z.number().describe('Workflow run ID'),
  name: z.string().nullable().describe('Workflow run name'),
  workflowId: z.number().describe('Workflow ID'),
  headBranch: z.string().nullable().describe('Head branch'),
  headSha: z.string().describe('Head commit SHA'),
  status: z.string().nullable().describe('Run status (queued, in_progress, completed, etc.)'),
  conclusion: z
    .string()
    .nullable()
    .describe('Run conclusion (success, failure, cancelled, skipped, etc.)'),
  event: z.string().describe('Triggering event (push, pull_request, workflow_dispatch, etc.)'),
  runNumber: z.number().describe('Run number'),
  runAttempt: z.number().optional().describe('Current run attempt number'),
  htmlUrl: z.string().describe('URL to the run on GitHub'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  actor: z.string().nullable().describe('User who triggered the run')
});

export let listWorkflowRuns = SlateTool.create(spec, {
  name: 'List Workflow Runs',
  key: 'list_workflow_runs',
  description: `List workflow runs for a repository, optionally filtered by a specific workflow, branch, event, status, or actor. Returns run status, conclusions, and metadata for each run.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      workflowId: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Filter by workflow ID or file name'),
      actor: z.string().optional().describe('Filter by the user who triggered the run'),
      branch: z.string().optional().describe('Filter by branch name'),
      event: z
        .string()
        .optional()
        .describe('Filter by event type (push, pull_request, workflow_dispatch, etc.)'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (queued, in_progress, completed, success, failure, etc.)'),
      perPage: z.number().optional().describe('Results per page (max 100, default 30)'),
      page: z.number().optional().describe('Page number for pagination'),
      excludePullRequests: z
        .boolean()
        .optional()
        .describe('Exclude pull request triggered runs')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching runs'),
      runs: z.array(workflowRunSchema).describe('List of workflow runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let data = await client.listWorkflowRuns(ctx.input.owner, ctx.input.repo, {
      workflowId: ctx.input.workflowId,
      actor: ctx.input.actor,
      branch: ctx.input.branch,
      event: ctx.input.event,
      status: ctx.input.status,
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      excludePullRequests: ctx.input.excludePullRequests
    });

    let runs = (data.workflow_runs ?? []).map((r: any) => ({
      runId: r.id,
      name: r.name,
      workflowId: r.workflow_id,
      headBranch: r.head_branch,
      headSha: r.head_sha,
      status: r.status,
      conclusion: r.conclusion,
      event: r.event,
      runNumber: r.run_number,
      runAttempt: r.run_attempt,
      htmlUrl: r.html_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      actor: r.actor?.login ?? null
    }));

    return {
      output: {
        totalCount: data.total_count,
        runs
      },
      message: `Found **${data.total_count}** workflow runs in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
