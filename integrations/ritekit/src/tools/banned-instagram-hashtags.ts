import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let bannedInstagramHashtags = SlateTool.create(spec, {
  name: 'Banned Instagram Hashtags',
  key: 'banned_instagram_hashtags',
  description: `Detects whether hashtags in a post are currently banned on Instagram. Returns a cleaned version of the post and a list of any banned hashtags found.
Use this before publishing Instagram content to avoid shadowbanning or reduced reach.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      post: z.string().describe('Post content with hashtags to check for Instagram bans')
    })
  )
  .output(
    z.object({
      cleanedPost: z.string().describe('The post with banned hashtags removed'),
      bannedHashtags: z
        .array(z.string())
        .describe('List of hashtags that are currently banned on Instagram')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.bannedInstagramHashtags(ctx.input.post);

    let banned = result.bannedHashtags || [];

    return {
      output: {
        cleanedPost: result.post,
        bannedHashtags: banned
      },
      message:
        banned.length > 0
          ? `Found **${banned.length}** banned Instagram hashtags: ${banned.map(h => `#${h}`).join(', ')}`
          : 'No banned Instagram hashtags detected.'
    };
  })
  .build();
