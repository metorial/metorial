import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to a task in Nozbe Teams. Comment body supports Markdown formatting. Comments can also be pinned within the task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to comment on'),
      body: z.string().describe('Comment text in Markdown format'),
      isPinned: z.boolean().optional().describe('Whether to pin the comment')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      body: z.string().describe('Comment body'),
      taskId: z.string().describe('Task ID'),
      authorId: z.string().describe('Author ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      isPinned: z.boolean().optional().describe('Whether the comment is pinned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {
      task_id: ctx.input.taskId,
      body: ctx.input.body
    };
    if (ctx.input.isPinned !== undefined) data.is_pinned = ctx.input.isPinned;

    let comment = await client.createComment(data);

    return {
      output: {
        commentId: comment.id,
        body: comment.body,
        taskId: comment.task_id,
        authorId: comment.author_id,
        createdAt: comment.created_at,
        isPinned: comment.is_pinned
      },
      message: `Added comment to task **${ctx.input.taskId}** (Comment ID: ${comment.id}).`
    };
  })
  .build();
