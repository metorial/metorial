import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List GitHub Actions workflows defined in a repository. Returns workflow definitions including their state (active/disabled), trigger events, and file paths. Use this to discover available workflows before triggering or inspecting runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      perPage: z.number().optional().describe('Results per page (max 100, default 30)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of workflows'),
      workflows: z
        .array(
          z.object({
            workflowId: z.number().describe('Workflow ID'),
            name: z.string().describe('Workflow name'),
            path: z.string().describe('Workflow file path in the repository'),
            state: z
              .string()
              .describe(
                'Workflow state (active, disabled_manually, disabled_inactivity, etc.)'
              ),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp'),
            htmlUrl: z.string().describe('URL to the workflow on GitHub'),
            badgeUrl: z.string().describe('URL to the workflow status badge')
          })
        )
        .describe('List of workflows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let data = await client.listWorkflows(ctx.input.owner, ctx.input.repo, {
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let workflows = (data.workflows ?? []).map((w: any) => ({
      workflowId: w.id,
      name: w.name,
      path: w.path,
      state: w.state,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      htmlUrl: w.html_url,
      badgeUrl: w.badge_url
    }));

    return {
      output: {
        totalCount: data.total_count,
        workflows
      },
      message: `Found **${data.total_count}** workflows in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
