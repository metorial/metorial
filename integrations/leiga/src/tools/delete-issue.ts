import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteIssueTool = SlateTool.create(spec, {
  name: 'Delete Issue',
  key: 'delete_issue',
  description: `Delete an issue from a Leiga project. The issue will be moved to trash and may be restorable on paid plans.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      issueId: z.number().describe('The ID of the issue to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteIssue(ctx.input.issueId);

    return {
      output: { success: true },
      message: `Deleted issue **#${ctx.input.issueId}**.`
    };
  })
  .build();
