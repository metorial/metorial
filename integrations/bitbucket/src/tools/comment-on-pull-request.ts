import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let commentOnPullRequestTool = SlateTool.create(spec, {
  name: 'Comment on Pull Request',
  key: 'comment_on_pull_request',
  description: `Add a comment to a pull request. Supports general comments and inline code comments on specific files and lines.
For inline comments, provide the file path and line number. For multi-line comments, provide both fromLine and toLine.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      pullRequestId: z.coerce.number().describe('Pull request ID'),
      content: z.string().describe('Comment text (supports Markdown)'),
      filePath: z
        .string()
        .optional()
        .describe('File path for inline comment (e.g. "src/main.ts")'),
      line: z.number().optional().describe('Line number for inline comment'),
      fromLine: z.number().optional().describe('Start line for multi-line inline comment'),
      toLine: z.number().optional().describe('End line for multi-line inline comment'),
      parentCommentId: z.coerce
        .number()
        .optional()
        .describe('Parent comment ID for threaded replies')
    })
  )
  .output(
    z.object({
      commentId: z.number(),
      createdOn: z.string().optional(),
      htmlUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let body: Record<string, any> = {
      content: { raw: ctx.input.content }
    };

    if (ctx.input.filePath) {
      body.inline = { path: ctx.input.filePath };
      if (ctx.input.fromLine !== undefined) body.inline.from = ctx.input.fromLine;
      if (ctx.input.toLine !== undefined) body.inline.to = ctx.input.toLine;
      if (ctx.input.line !== undefined) body.inline.to = ctx.input.line;
    }

    if (ctx.input.parentCommentId) {
      body.parent = { id: ctx.input.parentCommentId };
    }

    let comment = await client.createPullRequestComment(
      ctx.input.repoSlug,
      ctx.input.pullRequestId,
      body
    );

    return {
      output: {
        commentId: comment.id,
        createdOn: comment.created_on || undefined,
        htmlUrl: comment.links?.html?.href || undefined
      },
      message: `Added ${ctx.input.filePath ? 'inline' : ''} comment **#${comment.id}** on PR #${ctx.input.pullRequestId}.`
    };
  })
  .build();
