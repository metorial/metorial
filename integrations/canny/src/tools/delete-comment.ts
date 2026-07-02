import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCommentTool = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Permanently delete a comment from a feedback post. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.string().describe('The ID of the comment to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    await client.deleteComment(ctx.input.commentId);

    return {
      output: { success: true },
      message: `Deleted comment **${ctx.input.commentId}**.`
    };
  })
  .build();
