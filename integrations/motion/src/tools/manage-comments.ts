import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List all comments on a specific task. Returns paginated results with comment content and creator information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to list comments for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Unique identifier of the comment'),
            taskId: z.string().describe('ID of the task the comment belongs to'),
            content: z.string().optional().describe('HTML content of the comment'),
            createdAt: z.string().optional().describe('When the comment was created'),
            creator: z
              .object({
                userId: z.string().optional().describe('Creator user ID'),
                name: z.string().optional().describe('Creator name'),
                email: z.string().optional().describe('Creator email')
              })
              .optional()
              .describe('User who created the comment')
          })
        )
        .describe('List of comments'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      pageSize: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let result = await client.listComments({
      taskId: ctx.input.taskId,
      cursor: ctx.input.cursor
    });

    let comments = (result.comments || []).map((c: any) => ({
      commentId: c.id,
      taskId: c.taskId,
      content: c.content,
      createdAt: c.createdAt,
      creator: c.creator
        ? {
            userId: c.creator.id,
            name: c.creator.name,
            email: c.creator.email
          }
        : undefined
    }));

    return {
      output: {
        comments,
        nextCursor: result.meta?.nextCursor,
        pageSize: result.meta?.pageSize
      },
      message: `Found **${comments.length}** comment(s) on task`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a task in Motion. Comments support GitHub Flavored Markdown for rich text formatting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to comment on'),
      content: z.string().describe('Comment content in GitHub Flavored Markdown')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Unique identifier of the created comment'),
      taskId: z.string().describe('ID of the task'),
      content: z.string().optional().describe('HTML content of the comment'),
      createdAt: z.string().optional().describe('When the comment was created'),
      creator: z
        .object({
          userId: z.string().optional().describe('Creator user ID'),
          name: z.string().optional().describe('Creator name'),
          email: z.string().optional().describe('Creator email')
        })
        .optional()
        .describe('User who created the comment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let comment = await client.createComment({
      taskId: ctx.input.taskId,
      content: ctx.input.content
    });

    return {
      output: {
        commentId: comment.id,
        taskId: comment.taskId,
        content: comment.content,
        createdAt: comment.createdAt,
        creator: comment.creator
          ? {
              userId: comment.creator.id,
              name: comment.creator.name,
              email: comment.creator.email
            }
          : undefined
      },
      message: `Added comment to task \`${ctx.input.taskId}\``
    };
  })
  .build();
