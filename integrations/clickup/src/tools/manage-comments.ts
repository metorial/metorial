import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getTaskComments = SlateTool.create(spec, {
  name: 'Get Task Comments',
  key: 'get_task_comments',
  description: `Retrieve all comments on a ClickUp task. Returns the comment text, author, date, and resolution status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to get comments for')
    })
  )
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentId: z.string(),
          commentText: z.string(),
          authorId: z.string().optional(),
          authorName: z.string().optional(),
          dateCreated: z.string().optional(),
          resolved: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let comments = await client.getTaskComments(ctx.input.taskId);

    return {
      output: {
        comments: comments.map((c: any) => ({
          commentId: String(c.id),
          commentText: c.comment_text,
          authorId: c.user ? String(c.user.id) : undefined,
          authorName: c.user?.username,
          dateCreated: c.date,
          resolved: c.resolved
        }))
      },
      message: `Found **${comments.length}** comment(s) on task ${ctx.input.taskId}.`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Task Comment',
  key: 'create_task_comment',
  description: `Add a comment to a ClickUp task. Supports plain text comments. Optionally assign the comment to a user.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to comment on'),
      commentText: z.string().describe('The comment text'),
      assignee: z.number().optional().describe('User ID to assign the comment to'),
      notifyAll: z.boolean().optional().describe('Notify all members of the task')
    })
  )
  .output(
    z.object({
      commentId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let result = await client.createTaskComment(ctx.input.taskId, {
      commentText: ctx.input.commentText,
      assignee: ctx.input.assignee,
      notifyAll: ctx.input.notifyAll
    });

    return {
      output: {
        commentId: String(result.id)
      },
      message: `Added comment to task ${ctx.input.taskId}.`
    };
  })
  .build();
