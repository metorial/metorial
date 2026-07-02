import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from a task in Nozbe Teams.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.string().describe('ID of the comment to delete')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the deleted comment'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteComment(ctx.input.commentId);

    return {
      output: {
        commentId: ctx.input.commentId,
        deleted: true
      },
      message: `Deleted comment **${ctx.input.commentId}**.`
    };
  })
  .build();
