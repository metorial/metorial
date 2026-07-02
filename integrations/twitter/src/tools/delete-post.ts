import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { spec } from '../spec';

export let deletePost = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Delete an existing post (tweet) on Twitter/X. Only the author of the post can delete it.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the post to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the post was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);

    let result = await client.deletePost(ctx.input.postId);

    return {
      output: { deleted: result.data?.deleted === true },
      message: `Deleted post ${ctx.input.postId}.`
    };
  })
  .build();
