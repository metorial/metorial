import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export let controlWorkflowRun = SlateTool.create(spec, {
  name: 'Control Workflow Run',
  key: 'control_workflow_run',
  description: `Cancel, re-run, or delete a workflow run. Supports re-running all jobs, only failed jobs, or a specific job. Can also approve fork pull request runs and review pending deployments.`,
  instructions: [
    'Use "cancel" to stop an in-progress run.',
    'Use "rerun" to re-run all jobs in a completed run.',
    'Use "rerun_failed" to re-run only the failed jobs.',
    'Use "rerun_job" to re-run a specific job by its job ID.',
    'Use "approve" to approve a run from a fork pull request that requires approval.',
    'Use "review_deployment" to approve or reject pending deployment reviews.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID'),
      action: z
        .enum([
          'cancel',
          'rerun',
          'rerun_failed',
          'rerun_job',
          'delete',
          'approve',
          'review_deployment'
        ])
        .describe('Action to perform'),
      jobId: z.number().optional().describe('Job ID, required when action is "rerun_job"'),
      deploymentEnvironmentIds: z
        .array(z.number())
        .optional()
        .describe('Environment IDs to review, for "review_deployment" action'),
      deploymentState: z
        .enum(['approved', 'rejected'])
        .optional()
        .describe('Deployment review state'),
      deploymentComment: z.string().optional().describe('Comment for deployment review')
    })
  )
  .output(
    z.object({
      actionPerformed: z.string().describe('The action that was performed'),
      runId: z.number().describe('The workflow run ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, runId, action } = ctx.input;

    switch (action) {
      case 'cancel':
        await client.cancelWorkflowRun(owner, repo, runId);
        return {
          output: { actionPerformed: 'cancelled', runId },
          message: `Cancelled workflow run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'rerun':
        await client.rerunWorkflowRun(owner, repo, runId);
        return {
          output: { actionPerformed: 'rerun', runId },
          message: `Re-running all jobs for workflow run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'rerun_failed':
        await client.rerunFailedJobs(owner, repo, runId);
        return {
          output: { actionPerformed: 'rerun_failed', runId },
          message: `Re-running failed jobs for workflow run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'rerun_job':
        if (!ctx.input.jobId) {
          throw new Error('jobId is required when action is "rerun_job".');
        }
        await client.rerunWorkflowJob(owner, repo, ctx.input.jobId);
        return {
          output: { actionPerformed: 'rerun_job', runId },
          message: `Re-running job **${ctx.input.jobId}** from workflow run **#${runId}**.`
        };

      case 'delete':
        await client.deleteWorkflowRun(owner, repo, runId);
        return {
          output: { actionPerformed: 'deleted', runId },
          message: `Deleted workflow run **#${runId}** from **${owner}/${repo}**.`
        };

      case 'approve':
        await client.approvePendingRun(owner, repo, runId);
        return {
          output: { actionPerformed: 'approved', runId },
          message: `Approved fork pull request run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'review_deployment':
        if (!ctx.input.deploymentEnvironmentIds || !ctx.input.deploymentState) {
          throw new Error(
            'deploymentEnvironmentIds and deploymentState are required for "review_deployment".'
          );
        }
        await client.reviewPendingDeployments(
          owner,
          repo,
          runId,
          ctx.input.deploymentEnvironmentIds,
          ctx.input.deploymentState,
          ctx.input.deploymentComment ?? ''
        );
        return {
          output: { actionPerformed: `deployment_${ctx.input.deploymentState}`, runId },
          message: `${ctx.input.deploymentState === 'approved' ? 'Approved' : 'Rejected'} pending deployment for run **#${runId}**.`
        };
    }
  })
  .build();
