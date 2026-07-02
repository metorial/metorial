import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPublishingPost = SlateTool.create(spec, {
  name: 'Get Publishing Post',
  key: 'get_publishing_post',
  description: `Retrieve a publishing post from Sprout Social by its ID. Returns the fanned-out representation of the post showing individual entries per profile/time combination, including delivery status and metadata.`,
  instructions: [
    'Use the publishing post ID returned by the Create Draft Post tool.',
    'The delivery_status field always shows PENDING regardless of actual publication status.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publishingPostId: z.string().describe('The publishing post ID to retrieve.')
    })
  )
  .output(
    z.object({
      posts: z.array(z.any()).describe('Array of fanned-out publishing post entries.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId
    });

    let result = await client.getPublishingPost(ctx.input.publishingPostId);
    let posts = result?.data ?? [];

    return {
      output: { posts },
      message: `Retrieved publishing post \`${ctx.input.publishingPostId}\` with **${posts.length}** entr${posts.length === 1 ? 'y' : 'ies'}.`
    };
  });
