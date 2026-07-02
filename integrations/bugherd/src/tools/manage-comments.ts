import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.number().describe('Comment ID'),
  taskId: z.number().describe('Task ID the comment belongs to'),
  userId: z.number().describe('User ID of the commenter'),
  text: z.string().describe('Comment text'),
  isPrivate: z.boolean().describe('Whether the comment is private (members only)'),
  createdAt: z.string().describe('When the comment was created')
});

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List all comments on a specific BugHerd task.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID'),
      taskId: z.number().describe('Task ID to list comments for')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of comments on the task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let rawComments = await client.listComments(ctx.input.projectId, ctx.input.taskId);

    let comments = rawComments.map(c => ({
      commentId: c.id,
      taskId: c.task_id,
      userId: c.user_id,
      text: c.text,
      isPrivate: c.is_private,
      createdAt: c.created_at
    }));

    return {
      output: { comments },
      message: `Found **${comments.length}** comment(s) on task ${ctx.input.taskId}.`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a BugHerd task. Can be posted on behalf of a specific user and marked as private (members only) or public.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('Project ID'),
      taskId: z.number().describe('Task ID to comment on'),
      text: z.string().describe('Comment text'),
      userId: z.number().optional().describe('User ID to post the comment as'),
      email: z
        .string()
        .optional()
        .describe('Email of the user to post as (alternative to userId)'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('If true, comment is visible only to team members')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Created comment ID'),
      taskId: z.number().describe('Task ID'),
      text: z.string().describe('Comment text'),
      isPrivate: z.boolean().describe('Whether the comment is private'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let comment = await client.createComment(ctx.input.projectId, ctx.input.taskId, {
      text: ctx.input.text,
      userId: ctx.input.userId,
      email: ctx.input.email,
      isPrivate: ctx.input.isPrivate
    });

    return {
      output: {
        commentId: comment.id,
        taskId: comment.task_id,
        text: comment.text,
        isPrivate: comment.is_private,
        createdAt: comment.created_at
      },
      message: `Created ${comment.is_private ? 'private' : 'public'} comment on task ${ctx.input.taskId}.`
    };
  })
  .build();
