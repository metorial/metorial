import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePostTool = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Permanently delete a Beamer post by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.number().describe('ID of the post to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the post was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deletePost(ctx.input.postId);

    return {
      output: { deleted: true },
      message: `Deleted post with ID **${ctx.input.postId}**.`
    };
  })
  .build();
