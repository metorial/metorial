import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredString, requireRecord } from '../lib/response';
import { spec } from '../spec';

export let postComment = SlateTool.create(spec, {
  name: 'Post Task Comment',
  key: 'post_task_comment',
  description: `Post a comment on a task. Useful for adding updates, notes, or feedback to a specific task.`
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to comment on'),
      content: z.string().describe('Text content of the comment')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe(
          'Complete provider response, including values without a compatible summary field'
        ),
      commentId: z.string().describe('ID of the newly created comment'),
      content: z.string().describe('Content of the posted comment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let comment = requireRecord(await client.postComment(ctx.input.taskId, ctx.input.content));

    return {
      output: {
        commentId: requiredString(comment.commentId, 'commentId'),
        content: requiredString(comment.content, 'comment content'),
        raw: comment
      },
      message: `Posted comment on task **${ctx.input.taskId}**.`
    };
  })
  .build();
