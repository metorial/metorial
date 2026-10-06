import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient, githubHeaders } from '../lib/client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

export let getWorkflowRunLogs = SlateTool.create(spec, {
  name: 'Get Workflow Run Logs',
  key: 'get_workflow_run_logs',
  description: `Download workflow run logs as a ZIP archive or individual job logs as text. Can also permanently delete run logs.`,
  tags: {
    readOnly: false,
    destructive: true
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
      downloadUrl: z
        .string()
        .optional()
        .describe(
          'Temporary provider download URL; expires after one minute. Request the download again to obtain a fresh URL while the file exists'
        ),
      deleted: z.boolean().optional().describe('Whether logs were deleted')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, runId, jobId, action } = ctx.input;

    if (runId && jobId) throw createApiServiceError('Provide runId or jobId, not both.');
    if (action === 'delete') {
      if (!runId) throw createApiServiceError('runId is required to delete logs.');
      await client.deleteWorkflowRunLogs(owner, repo, runId);
      return {
        output: { deleted: true },
        message: `Deleted logs for workflow run **#${runId}** in **${owner}/${repo}**.`
      };
    }

    if (jobId) {
      let file = await client.downloadJobLogs(owner, repo, jobId);
      await ctx.addAttachment({
        type: 'url',
        url: file.apiUrl,
        mimeType: 'text/plain',
        filename: `job-${jobId}.log`,
        headers: { ...githubHeaders, Authorization: `Bearer ${ctx.auth.token}` }
      });
      return {
        output: { downloadUrl: file.downloadUrl },
        message: `Prepared log download for job **${jobId}**.`
      };
    }

    if (runId) {
      let file = await client.downloadWorkflowRunLogs(owner, repo, runId);
      await ctx.addAttachment({
        type: 'url',
        url: file.apiUrl,
        mimeType: 'application/zip',
        filename: `workflow-run-${runId}-logs.zip`,
        headers: { ...githubHeaders, Authorization: `Bearer ${ctx.auth.token}` }
      });
      return {
        output: { downloadUrl: file.downloadUrl },
        message: `Prepared log archive for workflow run **#${runId}**.`
      };
    }

    throw createApiServiceError('Either runId or jobId must be provided.');
  })
  .build();
