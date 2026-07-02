import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkflowRunLogs = SlateTool.create(spec, {
  name: 'Get Workflow Run Logs',
  key: 'get_workflow_run_logs',
  description: `Get download URLs for workflow run logs or individual job logs. Returns a redirect URL to download the log archive. Can also delete run logs.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      runId: z.number().optional().describe('Workflow run ID, for run-level logs'),
      jobId: z.number().optional().describe('Job ID, for job-level logs'),
      action: z
        .enum(['download', 'delete'])
        .optional()
        .describe('Action to perform (default: download)')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().optional().describe('URL to download the log archive'),
      deleted: z.boolean().optional().describe('Whether logs were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, runId, jobId, action } = ctx.input;

    if (action === 'delete') {
      if (!runId) throw new Error('runId is required to delete logs.');
      await client.deleteWorkflowRunLogs(owner, repo, runId);
      return {
        output: { deleted: true },
        message: `Deleted logs for workflow run **#${runId}** in **${owner}/${repo}**.`
      };
    }

    if (jobId) {
      let url = await client.downloadJobLogs(owner, repo, jobId);
      return {
        output: { downloadUrl: typeof url === 'string' ? url : '' },
        message: `Retrieved log download URL for job **${jobId}**.`
      };
    }

    if (runId) {
      let url = await client.downloadWorkflowRunLogs(owner, repo, runId);
      return {
        output: { downloadUrl: typeof url === 'string' ? url : '' },
        message: `Retrieved log download URL for workflow run **#${runId}**.`
      };
    }

    throw new Error('Either runId or jobId must be provided.');
  })
  .build();
