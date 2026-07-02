import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let deleteIssueTool = SlateTool.create(spec, {
  name: 'Delete Issue',
  key: 'delete_issue',
  description: `Permanently delete a Jira issue. Optionally delete all sub-tasks along with the parent issue. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z
        .string()
        .describe('The issue key (e.g., "PROJ-123") or numeric ID to delete.'),
      deleteSubtasks: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also deletes all sub-tasks of this issue.')
    })
  )
  .output(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID that was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    await client.deleteIssue(ctx.input.issueIdOrKey, ctx.input.deleteSubtasks);

    return {
      output: {
        issueIdOrKey: ctx.input.issueIdOrKey
      },
      message: `Deleted issue **${ctx.input.issueIdOrKey}**${ctx.input.deleteSubtasks ? ' and its sub-tasks' : ''}.`
    };
  })
  .build();
