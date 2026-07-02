import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePost = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Permanently delete a single-image post (standard post) and its related data from the directory.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('The post ID to delete.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      confirmation: z.string().describe('Confirmation message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.deletePost(ctx.input.postId);

    return {
      output: {
        status: result.status,
        confirmation:
          typeof result.message === 'string' ? result.message : JSON.stringify(result.message)
      },
      message: `Deleted post **${ctx.input.postId}**.`
    };
  })
  .build();
