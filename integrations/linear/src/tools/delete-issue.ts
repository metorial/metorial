import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { spec } from '../spec';

export let deleteIssueTool = SlateTool.create(spec, {
  name: 'Delete Issue',
  key: 'delete_issue',
  description: `Permanently deletes an issue from Linear. This action cannot be undone. Use "Update Issue" to archive instead if you want to preserve the issue.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      issueId: z.string().describe('Issue ID (UUID or identifier like ENG-123)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.deleteIssue(ctx.input.issueId);

    return {
      output: { success: result.success },
      message: result.success
        ? `Deleted issue **${ctx.input.issueId}**`
        : `Failed to delete issue ${ctx.input.issueId}`
    };
  })
  .build();
