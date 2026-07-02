import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let commentOnPullRequest = SlateTool.create(spec, {
  name: 'Comment on Pull Request',
  key: 'comment_on_pull_request',
  description: `Adds a comment to a pull request. Supports general comments, inline code comments on specific files/lines, replying to existing threads, and updating thread status (active, fixed, closed, etc.).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      pullRequestId: z.number().describe('Pull request ID'),
      content: z.string().describe('Comment content (supports markdown)'),
      threadId: z
        .number()
        .optional()
        .describe('Existing thread ID to reply to. Omit to create a new thread.'),
      parentCommentId: z
        .number()
        .optional()
        .describe('Parent comment ID for nested replies within a thread'),
      filePath: z
        .string()
        .optional()
        .describe('File path for inline code comment (e.g., "/src/app.ts")'),
      lineStart: z.number().optional().describe('Start line number for inline code comment'),
      lineEnd: z.number().optional().describe('End line number for inline code comment'),
      threadStatus: z
        .enum(['active', 'fixed', 'wontFix', 'closed', 'byDesign', 'pending'])
        .optional()
        .describe('Set or update the thread status')
    })
  )
  .output(
    z.object({
      threadId: z.number().describe('Thread ID'),
      commentId: z.number().optional().describe('Comment ID within the thread'),
      status: z.string().optional().describe('Thread status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    if (ctx.input.threadId) {
      // Reply to existing thread
      let result = await client.createComment(
        ctx.input.repositoryId,
        ctx.input.pullRequestId,
        ctx.input.threadId,
        ctx.input.content,
        ctx.input.parentCommentId
      );

      // Update thread status if specified
      if (ctx.input.threadStatus) {
        await client.updateCommentThread(
          ctx.input.repositoryId,
          ctx.input.pullRequestId,
          ctx.input.threadId,
          { status: ctx.input.threadStatus }
        );
      }

      return {
        output: {
          threadId: ctx.input.threadId,
          commentId: result.comments?.[result.comments.length - 1]?.id,
          status: ctx.input.threadStatus
        },
        message: `Replied to thread **#${ctx.input.threadId}** on PR **#${ctx.input.pullRequestId}**.`
      };
    } else {
      // Create new thread
      let threadContext = ctx.input.filePath
        ? {
            filePath: ctx.input.filePath,
            rightFileStart: ctx.input.lineStart
              ? { line: ctx.input.lineStart, offset: 1 }
              : undefined,
            rightFileEnd: ctx.input.lineEnd
              ? { line: ctx.input.lineEnd, offset: 1 }
              : ctx.input.lineStart
                ? { line: ctx.input.lineStart, offset: 1 }
                : undefined
          }
        : undefined;

      let thread = await client.createCommentThread(
        ctx.input.repositoryId,
        ctx.input.pullRequestId,
        {
          comments: [{ content: ctx.input.content, commentType: 'text' }],
          status: ctx.input.threadStatus,
          threadContext
        }
      );

      return {
        output: {
          threadId: thread.id,
          commentId: thread.comments?.[0]?.id,
          status: thread.status
        },
        message: ctx.input.filePath
          ? `Created inline comment on **${ctx.input.filePath}** in PR **#${ctx.input.pullRequestId}**.`
          : `Created comment thread on PR **#${ctx.input.pullRequestId}**.`
      };
    }
  })
  .build();
