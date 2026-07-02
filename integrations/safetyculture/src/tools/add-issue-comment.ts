import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addIssueComment = SlateTool.create(spec, {
  name: 'Add Issue Comment',
  key: 'add_issue_comment',
  description: `Add a comment to an existing issue's timeline. Use this to post status updates, notes, or follow-up information on an incident.`
})
  .input(
    z.object({
      issueId: z.string().describe('ID of the issue to comment on'),
      comment: z.string().describe('Comment text to add')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('ID of the commented issue'),
      success: z.boolean().describe('Whether the comment was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.addIssueComment(ctx.input.issueId, ctx.input.comment);

    return {
      output: {
        issueId: ctx.input.issueId,
        success: true
      },
      message: `Added comment to issue **${ctx.input.issueId}**.`
    };
  })
  .build();
