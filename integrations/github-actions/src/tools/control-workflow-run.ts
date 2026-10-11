import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

export let controlWorkflowRun = SlateTool.create(spec, {
  name: 'Control Workflow Run',
  key: 'control_workflow_run',
  description: `Cancel, force-cancel, re-run, or delete a workflow run. Supports re-running all jobs, only failed jobs, or a specific job, optionally with debug logging. Can also approve fork pull request runs and review pending deployments.`,
  instructions: [
    'Use "cancel" to stop an in-progress run.',
    'Use "force_cancel" only when a run does not respond to "cancel"; it bypasses conditions such as always() that keep jobs running.',
    'Set enableDebugLogging to true with "rerun", "rerun_failed", or "rerun_job" to re-run with runner and step debug logs.',
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
          'force_cancel',
          'rerun',
          'rerun_failed',
          'rerun_job',
          'delete',
          'approve',
          'review_deployment'
        ])
        .describe('Action to perform'),
      jobId: z.number().optional().describe('Job ID, required when action is "rerun_job"'),
      enableDebugLogging: z
        .boolean()
        .optional()
        .describe(
          'Enable debug logging for the re-run, for "rerun", "rerun_failed", or "rerun_job" (default false)'
        ),
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
    validateInput(ctx.input);
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, runId, action, enableDebugLogging } = ctx.input;
    if (
      enableDebugLogging === true &&
      action !== 'rerun' &&
      action !== 'rerun_failed' &&
      action !== 'rerun_job'
    )
      throw createApiServiceError(
        'enableDebugLogging applies only to "rerun", "rerun_failed", and "rerun_job".'
      );

    switch (action) {
      case 'cancel':
        await client.cancelWorkflowRun(owner, repo, runId);
        return {
          output: { actionPerformed: 'cancelled', runId },
          message: `GitHub accepted cancellation for workflow run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'force_cancel':
        await client.forceCancelWorkflowRun(owner, repo, runId);
        return {
          output: { actionPerformed: 'force_cancelled', runId },
          message: `GitHub accepted force cancellation for workflow run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'rerun':
        await client.rerunWorkflowRun(owner, repo, runId, enableDebugLogging);
        return {
          output: { actionPerformed: 'rerun', runId },
          message: `Re-running all jobs for workflow run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'rerun_failed':
        await client.rerunFailedJobs(owner, repo, runId, enableDebugLogging);
        return {
          output: { actionPerformed: 'rerun_failed', runId },
          message: `Re-running failed jobs for workflow run **#${runId}** in **${owner}/${repo}**.`
        };

      case 'rerun_job': {
        if (!ctx.input.jobId) {
          throw createApiServiceError('jobId is required when action is "rerun_job".');
        }
        const job = await client.getJob(owner, repo, ctx.input.jobId);
        if (job.run_id !== runId)
          throw createApiServiceError('The supplied jobId does not belong to runId.');
        await client.rerunWorkflowJob(owner, repo, ctx.input.jobId, enableDebugLogging);
        return {
          output: { actionPerformed: 'rerun_job', runId },
          message: `Re-running job **${ctx.input.jobId}** from workflow run **#${runId}**.`
        };
      }

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
        if (
          !ctx.input.deploymentEnvironmentIds?.length ||
          !ctx.input.deploymentState ||
          !ctx.input.deploymentComment?.trim()
        ) {
          throw createApiServiceError(
            'Nonempty deploymentEnvironmentIds, deploymentState, and deploymentComment are required for "review_deployment".'
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
