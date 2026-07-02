import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

let trendingSchema = z.object({
  tag: z.string().describe('Hashtag text without the # symbol'),
  tweets: z.number().describe('Number of tweets using this hashtag per hour'),
  exposure: z.number().describe('Estimated reach/exposure per hour'),
  retweets: z.number().describe('Number of retweets per hour'),
  images: z.number().describe('Percentage of tweets with images'),
  links: z.number().describe('Percentage of tweets with links'),
  mentions: z.number().describe('Percentage of tweets with mentions'),
  color: z.number().describe('Color grade')
});

export let trendingHashtags = SlateTool.create(spec, {
  name: 'Trending Hashtags',
  key: 'trending_hashtags',
  description: `Returns hashtags that are currently trending on social media with their engagement metrics.
Use this to discover popular hashtags to include in your content for maximum visibility.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      greenOnly: z
        .boolean()
        .optional()
        .describe('Only return green (trending/performing well) hashtags'),
      latinOnly: z.boolean().optional().describe('Only return hashtags with Latin characters')
    })
  )
  .output(
    z.object({
      hashtags: z.array(trendingSchema).describe('List of currently trending hashtags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.trendingHashtags(ctx.input.greenOnly, ctx.input.latinOnly);

    let tags = result.tags || [];

    return {
      output: { hashtags: tags },
      message: `Found **${tags.length}** trending hashtags. Top: ${tags
        .slice(0, 5)
        .map(t => `#${t.tag}`)
        .join(', ')}`
    };
  })
  .build();
