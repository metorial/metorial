import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let deleteIssueTool = SlateTool.create(spec, {
  name: 'Delete Issue',
  key: 'delete_issue',
  description: `Permanently delete a Jira issue. Optionally deletes subtasks as well. This action cannot be undone.`,
  constraints: [
    'This action is irreversible.',
    'Requires appropriate project permissions to delete issues.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      issueIdOrKey: z
        .string()
        .describe('Issue key (e.g., PROJ-123) or numeric issue ID to delete'),
      deleteSubtasks: z
        .boolean()
        .optional()
        .describe('Whether to also delete subtasks. Defaults to false.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the issue was successfully deleted'),
      issueIdOrKey: z.string().describe('The issue key or ID that was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    await client.deleteIssue(ctx.input.issueIdOrKey, ctx.input.deleteSubtasks);

    return {
      output: {
        deleted: true,
        issueIdOrKey: ctx.input.issueIdOrKey
      },
      message: `Deleted issue **${ctx.input.issueIdOrKey}**${ctx.input.deleteSubtasks ? ' and its subtasks' : ''}.`
    };
  })
  .build();
