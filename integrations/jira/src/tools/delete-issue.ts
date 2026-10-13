import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createJiraClient, siteInputSchema } from '../lib/site';
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
        .describe('If true, also deletes all sub-tasks of this issue.'),
      site: siteInputSchema
    })
  )
  .output(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID that was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createJiraClient(ctx.auth, ctx.input.site);

    await client.deleteIssue(ctx.input.issueIdOrKey, ctx.input.deleteSubtasks);

    return {
      output: {
        issueIdOrKey: ctx.input.issueIdOrKey
      },
      message: `Deleted issue **${ctx.input.issueIdOrKey}**${ctx.input.deleteSubtasks ? ' and its sub-tasks' : ''}.`
    };
  })
  .build();
