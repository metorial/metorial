import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { mapPost, postSchema } from '../lib/helpers';
import { spec } from '../spec';

export let getPost = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve one or more posts by their IDs. Returns full post details including text, author, metrics, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postIds: z.array(z.string()).min(1).describe('One or more post IDs to retrieve')
    })
  )
  .output(
    z.object({
      posts: z.array(postSchema).describe('Retrieved posts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);

    let result: any;
    if (ctx.input.postIds.length === 1) {
      result = await client.getPost(ctx.input.postIds[0]!);
      let post = mapPost(result.data);
      return {
        output: { posts: [post] },
        message: `Retrieved post by **@${result.includes?.users?.[0]?.username || 'unknown'}**: "${post.text?.substring(0, 80)}${(post.text?.length || 0) > 80 ? '...' : ''}"`
      };
    }

    result = await client.getPosts(ctx.input.postIds);
    let posts = (result.data || []).map(mapPost);

    return {
      output: { posts },
      message: `Retrieved **${posts.length}** post(s).`
    };
  })
  .build();
