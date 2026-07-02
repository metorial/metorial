import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflowState = SlateTool.create(spec, {
  name: 'Manage Workflow State',
  key: 'manage_workflow_state',
  description: `Enable or disable a GitHub Actions workflow. Disabled workflows will not be triggered by events. Also retrieves workflow details and usage statistics.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      workflowId: z.union([z.number(), z.string()]).describe('Workflow ID or file name'),
      action: z
        .enum(['enable', 'disable', 'get', 'get_usage'])
        .describe('Action to perform on the workflow')
    })
  )
  .output(
    z.object({
      workflowId: z.number().optional().describe('Workflow ID'),
      name: z.string().optional().describe('Workflow name'),
      state: z.string().optional().describe('Workflow state'),
      path: z.string().optional().describe('Workflow file path'),
      htmlUrl: z.string().optional().describe('URL to the workflow'),
      billable: z
        .any()
        .optional()
        .describe('Billable usage by runner OS (UBUNTU, MACOS, WINDOWS)'),
      actionPerformed: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { owner, repo, workflowId, action } = ctx.input;

    if (action === 'enable') {
      await client.enableWorkflow(owner, repo, workflowId);
      return {
        output: { actionPerformed: 'enabled' },
        message: `Enabled workflow **${workflowId}** in **${owner}/${repo}**.`
      };
    }

    if (action === 'disable') {
      await client.disableWorkflow(owner, repo, workflowId);
      return {
        output: { actionPerformed: 'disabled' },
        message: `Disabled workflow **${workflowId}** in **${owner}/${repo}**.`
      };
    }

    if (action === 'get_usage') {
      let usage = await client.getWorkflowUsage(owner, repo, workflowId);
      return {
        output: {
          billable: usage.billable,
          actionPerformed: 'get_usage'
        },
        message: `Retrieved usage statistics for workflow **${workflowId}** in **${owner}/${repo}**.`
      };
    }

    let workflow = await client.getWorkflow(owner, repo, workflowId);
    return {
      output: {
        workflowId: workflow.id,
        name: workflow.name,
        state: workflow.state,
        path: workflow.path,
        htmlUrl: workflow.html_url,
        actionPerformed: 'get'
      },
      message: `Retrieved workflow **${workflow.name}** (${workflow.state}) in **${owner}/${repo}**.`
    };
  })
  .build();
