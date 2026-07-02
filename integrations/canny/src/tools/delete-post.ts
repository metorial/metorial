import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let deletePostTool = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Permanently delete a feedback post. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('The ID of the post to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    await client.deletePost(ctx.input.postId);

    return {
      output: { success: true },
      message: `Deleted post **${ctx.input.postId}**.`
    };
  })
  .build();
