import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from Project Bubble. Deleting a comment also removes all replies and attached files.`,
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
      deleted: z.boolean().describe('Whether the comment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    await client.deleteComment(ctx.input.commentId);

    return {
      output: { deleted: true },
      message: `Deleted comment **${ctx.input.commentId}**.`
    };
  })
  .build();
