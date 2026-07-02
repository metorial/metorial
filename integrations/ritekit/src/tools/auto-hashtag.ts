import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let autoHashtag = SlateTool.create(spec, {
  name: 'Auto-Hashtag',
  key: 'auto_hashtag',
  description: `Automatically adds relevant hashtags to a social media post based on real-time hashtag popularity.
Use this to optimize posts for reach and engagement by inserting up to a specified number of trending, relevant hashtags either at the end of the text or inline.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      post: z.string().describe('Text of the social media post to add hashtags to'),
      maxHashtags: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe('Maximum number of hashtags to add (default: 2)'),
      hashtagPosition: z
        .enum(['end', 'auto'])
        .optional()
        .describe(
          'Where to place hashtags: "end" appends to the end, "auto" inserts inline where relevant (default: auto)'
        )
    })
  )
  .output(
    z.object({
      post: z.string().describe('The post text with hashtags added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.autoHashtag(
      ctx.input.post,
      ctx.input.maxHashtags,
      ctx.input.hashtagPosition
    );

    return {
      output: {
        post: result.post
      },
      message: `Added hashtags to post: "${result.post}"`
    };
  })
  .build();
