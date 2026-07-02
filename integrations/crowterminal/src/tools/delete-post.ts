import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let deletePost = SlateTool.create(spec, {
  name: 'Delete Post',
  key: 'delete_post',
  description: `Delete a post from CrowTerminal. This cancels queued or scheduled posts before they are published. Published posts are removed from CrowTerminal records but remain on the target platform.`,
  constraints: [
    'Posts that are currently being processed may not be deletable until processing completes.',
    'Deleting a published post only removes it from CrowTerminal — it does not remove the post from the social media platform.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('Unique identifier of the post to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the post was successfully deleted'),
      postId: z.string().describe('ID of the deleted post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrowTerminalClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.info({ message: 'Deleting post', postId: ctx.input.postId });

    await client.deletePost(ctx.input.postId);

    return {
      output: {
        deleted: true,
        postId: ctx.input.postId
      },
      message: `Post **${ctx.input.postId}** has been deleted.`
    };
  })
  .build();
