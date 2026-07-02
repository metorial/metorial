import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let commentOnIssueTool = SlateTool.create(spec, {
  name: 'Comment on Issue',
  key: 'comment_on_issue',
  description: `Add a comment to an issue in the repository's built-in issue tracker.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      issueId: z.coerce.number().describe('Issue ID'),
      content: z.string().describe('Comment text (supports Markdown)')
    })
  )
  .output(
    z.object({
      commentId: z.number(),
      createdOn: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let comment = await client.createIssueComment(ctx.input.repoSlug, ctx.input.issueId, {
      content: { raw: ctx.input.content }
    });

    return {
      output: {
        commentId: comment.id,
        createdOn: comment.created_on || undefined
      },
      message: `Added comment **#${comment.id}** on issue #${ctx.input.issueId}.`
    };
  })
  .build();
