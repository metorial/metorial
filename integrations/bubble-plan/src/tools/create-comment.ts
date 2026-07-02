import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Create a new comment on a project, task, or subtask. Supports replies by specifying a parent comment ID.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to comment on'),
      comment: z.string().describe('Comment text content'),
      taskId: z.string().optional().describe('Task ID to associate the comment with'),
      subtaskId: z.string().optional().describe('Subtask ID to associate the comment with'),
      parentId: z.string().optional().describe('Parent comment ID to create a reply')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      comment: z.string().describe('Comment text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.createComment(ctx.input.projectId, {
      comment: ctx.input.comment,
      taskId: ctx.input.taskId,
      subtaskId: ctx.input.subtaskId,
      parentId: ctx.input.parentId
    });

    let c = result?.data?.[0] || result?.data || result;

    return {
      output: {
        commentId: String(c.comment_id),
        comment: c.comment || ctx.input.comment
      },
      message: `Created comment on project ${ctx.input.projectId}.`
    };
  })
  .build();
