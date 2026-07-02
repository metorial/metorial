import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { commentSchema } from '../lib/types';
import { spec } from '../spec';

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Adds a comment to a task. Supports markdown formatting and threaded replies by specifying a parent comment ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to comment on'),
      text: z.string().describe('Comment text in markdown'),
      parentId: z.string().optional().describe('Parent comment ID for threaded replies')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let comment = await client.createComment(ctx.input);

    return {
      output: comment,
      message: `Added comment to task **${ctx.input.taskId}** by **${comment.author}**.`
    };
  })
  .build();
