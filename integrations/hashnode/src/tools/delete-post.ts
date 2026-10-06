import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { selection } from '../lib/schemas';
import { spec } from '../spec';

export let deletePost = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Soft-remove a published post from active feeds and listings. The native post may remain readable by ID; this does not erase history or cached content. Requires Pro and the post author or a publication admin.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ...selection,
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
      publicationHost:
        ctx.input.publicationHost ??
        (ctx.input.publicationId === undefined ? ctx.config.publicationHost : undefined),
      publicationId: ctx.input.publicationId
    });

    let post = await client.removePost(ctx.input.postId);

    return {
      output: {
        postId: post.id
      },
      message: `Hashnode accepted removal of post \`${ctx.input.postId}\``
    };
  })
  .build();
