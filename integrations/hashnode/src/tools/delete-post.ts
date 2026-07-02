import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePost = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Permanently remove a published blog post from the publication. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the post to delete')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the deleted post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let post = await client.removePost(ctx.input.postId);

    return {
      output: {
        postId: post?.id || ctx.input.postId
      },
      message: `Deleted post \`${ctx.input.postId}\``
    };
  })
  .build();
