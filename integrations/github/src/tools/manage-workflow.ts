import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `Interact with GitHub Actions workflows: list workflows, list runs, trigger a workflow dispatch, cancel or rerun a workflow run, and view run jobs.`,
  instructions: [
    'Use action "list_workflows" to list all workflows in a repository.',
    'Use "list_runs" to see recent workflow runs, optionally filtered by workflow, branch, event, or status.',
    'Use "trigger" to dispatch a workflow_dispatch event. The workflow must support the workflow_dispatch trigger.',
    'Use "cancel" or "rerun" with a runId.',
    'Use "get_run" to get details of a specific run.',
    'Use "list_jobs" to see jobs of a specific run.'
  ]
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      action: z
        .enum([
          'list_workflows',
          'list_runs',
          'get_run',
          'trigger',
          'cancel',
          'rerun',
          'list_jobs'
        ])
        .describe('Workflow action to perform'),
      workflowId: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Workflow ID or filename (e.g., "ci.yml")'),
      runId: z
        .number()
        .optional()
        .describe('Workflow run ID (for get_run, cancel, rerun, list_jobs)'),
      ref: z
        .string()
        .optional()
        .describe('Git ref to trigger the workflow on (for trigger action)'),
      inputs: z
        .record(z.string(), z.string())
        .optional()
        .describe('Workflow inputs (for trigger action)'),
      branch: z.string().optional().describe('Filter runs by branch'),
      event: z.string().optional().describe('Filter runs by event type'),
      status: z
        .string()
        .optional()
        .describe('Filter runs by status (e.g., "completed", "in_progress", "queued")'),
      perPage: z.number().optional().describe('Results per page'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      workflows: z
        .array(
          z.object({
            workflowId: z.number(),
            name: z.string(),
            path: z.string(),
            state: z.string()
          })
        )
        .optional()
        .describe('List of workflows'),
      runs: z
        .array(
          z.object({
            runId: z.number(),
            name: z.string().nullable(),
            status: z.string().nullable(),
            conclusion: z.string().nullable(),
            headBranch: z.string().nullable(),
            event: z.string(),
            htmlUrl: z.string(),
            createdAt: z.string()
          })
        )
        .optional()
        .describe('List of workflow runs'),
      run: z
        .object({
          runId: z.number(),
          name: z.string().nullable(),
          status: z.string().nullable(),
          conclusion: z.string().nullable(),
          headBranch: z.string().nullable(),
          headSha: z.string(),
          event: z.string(),
          htmlUrl: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
        .optional()
        .describe('Single workflow run details'),
      jobs: z
        .array(
          z.object({
            jobId: z.number(),
            name: z.string(),
            status: z.string(),
            conclusion: z.string().nullable(),
            startedAt: z.string().nullable(),
            completedAt: z.string().nullable()
          })
        )
        .optional()
        .describe('List of jobs in a run'),
      triggered: z.boolean().optional().describe('Whether the workflow was triggered'),
      cancelled: z.boolean().optional().describe('Whether the run was cancelled'),
      rerunStarted: z.boolean().optional().describe('Whether the rerun was started')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, action } = ctx.input;

    if (action === 'list_workflows') {
      let data = await client.listWorkflows(owner, repo, {
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
      let workflows = data.workflows.map((w: any) => ({
        workflowId: w.id,
        name: w.name,
        path: w.path,
        state: w.state
      }));
      return {
        output: { workflows },
        message: `Found **${workflows.length}** workflows in **${owner}/${repo}**.`
      };
    }

    if (action === 'list_runs') {
      let data = await client.listWorkflowRuns(owner, repo, {
        workflowId: ctx.input.workflowId,
        branch: ctx.input.branch,
        event: ctx.input.event,
        status: ctx.input.status,
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
      let runs = data.workflow_runs.map((r: any) => ({
        runId: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        headBranch: r.head_branch,
        event: r.event,
        htmlUrl: r.html_url,
        createdAt: r.created_at
      }));
      return {
        output: { runs },
        message: `Found **${runs.length}** workflow runs in **${owner}/${repo}**.`
      };
    }

    if (action === 'get_run') {
      if (!ctx.input.runId) throw new Error('runId is required for get_run.');
      let r = await client.getWorkflowRun(owner, repo, ctx.input.runId);
      return {
        output: {
          run: {
            runId: r.id,
            name: r.name,
            status: r.status,
            conclusion: r.conclusion,
            headBranch: r.head_branch,
            headSha: r.head_sha,
            event: r.event,
            htmlUrl: r.html_url,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }
        },
        message: `Workflow run **#${r.id}**: ${r.status}${r.conclusion ? ` (${r.conclusion})` : ''} — ${r.html_url}`
      };
    }

    if (action === 'trigger') {
      if (!ctx.input.workflowId) throw new Error('workflowId is required for trigger.');
      if (!ctx.input.ref) throw new Error('ref is required for trigger.');
      await client.triggerWorkflowDispatch(owner, repo, ctx.input.workflowId, {
        ref: ctx.input.ref,
        inputs: ctx.input.inputs as Record<string, string> | undefined
      });
      return {
        output: { triggered: true },
        message: `Triggered workflow **${ctx.input.workflowId}** on ref \`${ctx.input.ref}\` in **${owner}/${repo}**.`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.runId) throw new Error('runId is required for cancel.');
      await client.cancelWorkflowRun(owner, repo, ctx.input.runId);
      return {
        output: { cancelled: true },
        message: `Cancelled workflow run **#${ctx.input.runId}** in **${owner}/${repo}**.`
      };
    }

    if (action === 'rerun') {
      if (!ctx.input.runId) throw new Error('runId is required for rerun.');
      await client.rerunWorkflow(owner, repo, ctx.input.runId);
      return {
        output: { rerunStarted: true },
        message: `Re-running workflow run **#${ctx.input.runId}** in **${owner}/${repo}**.`
      };
    }

    if (action === 'list_jobs') {
      if (!ctx.input.runId) throw new Error('runId is required for list_jobs.');
      let data = await client.listWorkflowRunJobs(owner, repo, ctx.input.runId, {
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
      let jobs = data.jobs.map((j: any) => ({
        jobId: j.id,
        name: j.name,
        status: j.status,
        conclusion: j.conclusion,
        startedAt: j.started_at,
        completedAt: j.completed_at
      }));
      return {
        output: { jobs },
        message: `Found **${jobs.length}** jobs in workflow run **#${ctx.input.runId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
