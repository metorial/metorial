import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateComment = SlateTool.create(spec, {
  name: 'Update Comment',
  key: 'update_comment',
  description: `Update an existing comment on a task in Nozbe Teams. Modify the comment body or toggle pinned status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('ID of the comment to update'),
      body: z.string().optional().describe('New comment text in Markdown format'),
      isPinned: z.boolean().optional().describe('Whether the comment should be pinned')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the updated comment'),
      body: z.string().describe('Updated comment body'),
      taskId: z.string().describe('Task ID'),
      editedAt: z.number().nullable().optional().describe('Edit timestamp'),
      isPinned: z.boolean().optional().describe('Pinned status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {};
    if (ctx.input.body !== undefined) data.body = ctx.input.body;
    if (ctx.input.isPinned !== undefined) data.is_pinned = ctx.input.isPinned;

    let comment = await client.updateComment(ctx.input.commentId, data);

    return {
      output: {
        commentId: comment.id,
        body: comment.body,
        taskId: comment.task_id,
        editedAt: comment.edited_at,
        isPinned: comment.is_pinned
      },
      message: `Updated comment **${comment.id}**.`
    };
  })
  .build();
